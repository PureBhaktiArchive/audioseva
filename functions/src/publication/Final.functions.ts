/*!
 * sri sri guru gauranga jayatah
 */

import { createItem, readItem, readItems, updateItem } from '@directus/sdk';
import contentDisposition from 'content-disposition';
import { getDatabase } from 'firebase-admin/database';
import { getFunctions } from 'firebase-admin/functions';
import { getStorage } from 'firebase-admin/storage';
import * as functions from 'firebase-functions';
import {
  concat,
  drain,
  filter,
  map,
  pipeAsync,
  pipeSync,
  waitRace,
  zip,
} from 'iter-ops';
import { finished } from 'node:stream/promises';
import * as path from 'path';
import * as util from 'util';
import { FidelityCheckRecord } from '../FidelityCheck/FidelityCheckRecord';
import { StorageFileReference } from '../StorageFileReference';
import { StorageManager } from '../StorageManager';
import { objectToIterableEntries } from '../iterable-helpers';
import { getFileDurationPath, metadataCacheRef } from '../metadata-database';
import { getDifference } from '../object-diff';
import { AudioRecord } from './AudioRecord';
import { NormalRecord } from './FinalRecord';
import { directus } from './directus';
import { resolveFidelityRecord, sanitizeContentDetails } from './finalization';
import { createIdGenerator } from './id-generator';
import { composeFileName, composeMediaMetadata } from './metadata';
import { addMediaMetadata, convertToMp3, transcode } from './transcode';

/**
 * Copies a finalized file into a dedicated bucket
 * @param record
 * @returns
 */
const copyFile = async ({ id, file }: NormalRecord) => {
  const sourceFile = getStorage().bucket(file.bucket).file(file.name, {
    generation: file.generation,
  });
  const finalFile = StorageManager.getBucket('final').file(
    `${id}${path.extname(file.name)}`
  );

  // Calling `getMetadata` on the source file to throw an exception if it does not exist
  await Promise.all([sourceFile.getMetadata(), finalFile.exists()]);
  if (
    finalFile.metadata.metadata?.source === sourceFile.metadata.id &&
    finalFile.metadata.md5Hash === sourceFile.metadata.md5Hash
  )
    return;

  await sourceFile.copy(finalFile, {
    contentType: sourceFile.metadata.contentType,
    metadata: {
      // Keeping the source file metadata to preserve the `mtime`
      ...sourceFile.metadata.metadata,
      // Injecting the custom metadata here due to https://github.com/googleapis/nodejs-storage/issues/2389
      source: sourceFile.metadata.id,
    },
  });
};

const getMP3File = (id: number) =>
  getStorage()
    .bucket(functions.config().final?.public?.bucket)
    .file(`${id}.mp3`);

const deleteFile = (id: number): Promise<void> =>
  getMP3File(id)
    .delete({ ignoreNotFound: true })
    // Chaining to an empty `then` to ignore the result of the promise and return `Promise<void>`
    .then();

const PUBLICATION_TOPIC = 'publish';

export const publish = functions.pubsub
  .topic(PUBLICATION_TOPIC)
  .onPublish(async () => {
    const [fidelitySnapshot, metadataCacheSnapshot, audioRecords] =
      await Promise.all([
        getDatabase().ref('/FC/records').once('value'),
        metadataCacheRef.once('value'),
        directus.request(readItems('audios', { limit: -1 })),
      ]);

    const fidelityRecords = new Map(
      objectToIterableEntries(
        fidelitySnapshot.val() as Record<string, FidelityCheckRecord>
      )
    );
    const existingFileIds = new Set(audioRecords.map(({ id }) => id));
    const getDuration = (file: StorageFileReference) =>
      metadataCacheSnapshot.child(getFileDurationPath(file)).val() as number;

    // We need to keep track of all the published task IDs in order to detect redirects properly
    const publishedTasks = new Map<string, number>();

    const fileQueue = getFunctions().taskQueue('finalizeFile');

    const generateItem = (
      fidelityRecord: FidelityCheckRecord,
      taskId: string,
      id: number
    ): Partial<AudioRecord> =>
      fidelityRecord && 'approval' in fidelityRecord && fidelityRecord.approval
        ? // Generating a redirect record if the target task has been already published under another file ID
          publishedTasks.has(taskId) && publishedTasks.get(taskId) !== id
          ? {
              status: 'redirect',
              redirectTo: publishedTasks.get(taskId),
            }
          : // Normal record
            (publishedTasks.set(taskId, id),
            {
              status: 'active',
              sourceFileId: taskId,
              ...sanitizeContentDetails(fidelityRecord.contentDetails),
              duration: getDuration(fidelityRecord.file),
            })
        : // Deactivating
          { status: 'inactive' };

    // Updating existing (previously finalized) records
    const updates = pipeSync(
      audioRecords,
      // Keeping records without a task ID intact because they may have been created not by this code
      filter((record) => !!record.sourceFileId),
      // Finding a corresponding fidelity record
      map((record) => ({
        original: record,
        ...resolveFidelityRecord(fidelityRecords, record.sourceFileId),
      })),
      map(({ fidelityRecord, taskId, original }) => ({
        original,
        update: getDifference(
          original,
          generateItem(fidelityRecord, taskId, original.id)
        ),
      })),
      // Filtering out items that have no changes
      filter(({ update }) => !util.isDeepStrictEqual(update, {})),
      map(({ original, update }) =>
        Promise.all([
          directus.request(updateItem('audios', original.id, update)),
          // Updating the file is the status stays active or turns into active
          update.status ?? original.status === 'active'
            ? fileQueue.enqueue({
                /*TODO */
              })
            : deleteFile(original.id),
        ])
      )
    );

    const fileIdGenerator = createIdGenerator((id) => existingFileIds.has(id));

    const inserts = pipeSync(
      fidelityRecords,
      filter(
        ([taskId, fidelityRecord]) =>
          'approval' in fidelityRecord &&
          fidelityRecord.approval &&
          !fidelityRecord.replacement &&
          !publishedTasks.has(taskId)
      ),
      zip(fileIdGenerator),
      map(([[taskId, fidelityRecord], id]) =>
        Promise.all([
          directus.request(
            createItem('audios', {
              id,
              ...generateItem(fidelityRecord, taskId, id),
            })
          ),
          fileQueue.enqueue({
            /*TODO */
          }),
        ])
      )
    );

    // Awaiting for the first item of the one-item iterator emitted by `drain` in order to trigger the whole pipeline
    await pipeAsync(
      pipeSync(updates, concat(inserts)),
      waitRace(20),
      drain()
    ).catch(functions.logger.error).first;
  });

export const createMP3 = functions.storage
  .bucket(StorageManager.getFullBucketName('final'))
  .object()
  .onFinalize(async (object) => {
    const id = +path.basename(object.name, path.extname(object.name));
    if (Number.isNaN(id))
      return functions.logger.warn('Object name is not a number:', object.name);

    const mp3File = getStorage()
      .bucket(functions.config().final?.public?.bucket)
      .file(`${id}.mp3`);

    const [[mp3Exists], record] = await Promise.all([
      mp3File.exists(),
      directus.request(readItem('audios', id)),
    ]);

    if (
      mp3Exists &&
      mp3File.metadata.metadata?.sourceMd5Hash === object.md5Hash
    )
      // MP3 file was created from the same source file, no need transcoding
      return functions.logger.info('MP3 file already exists');

    const uploadStream = mp3File.createWriteStream({
      resumable: false,
      metadata: {
        contentType: 'audio/mpeg',
        contentDisposition: contentDisposition(composeFileName(record)),
        metadata: {
          sourceMd5Hash: object.md5Hash,
        },
      },
    });

    functions.logger.debug('Transcoding file', object.id, 'to', mp3File.id);

    await Promise.all([
      transcode(
        getStorage().bucket(object.bucket).file(object.name).createReadStream(),
        uploadStream,
        convertToMp3,
        addMediaMetadata(composeMediaMetadata(record))
      ),
      finished(uploadStream),
    ]);
  });
