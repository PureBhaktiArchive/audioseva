/*!
 * sri sri guru gauranga jayatah
 */

import { createItem, readItem, readItems, updateItem } from '@directus/sdk';
import contentDisposition from 'content-disposition';
import { getDatabase } from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';
import * as functions from 'firebase-functions';
import { drain, map, pipeAsync, pipeSync, waitRace } from 'iter-ops';
import { finished } from 'node:stream/promises';
import * as path from 'path';
import * as util from 'util';
import { FidelityCheckRecord } from '../FidelityCheck/FidelityCheckRecord';
import { StorageFileReference } from '../StorageFileReference';
import { StorageManager } from '../StorageManager';
import { objectToIterableEntries } from '../iterable-helpers';
import { getDifference } from '../object-diff';
import { ActiveRecord, AudioRecord } from './AudioRecord';
import { directus } from './directus';
import { finalizeAudios } from './finalization';
import { composeFileName, composeMediaMetadata } from './metadata';
import { addMediaMetadata, convertToMp3, transcode } from './transcode';

/**
 * Copies a finalized file into a dedicated bucket
 * @param record
 * @returns
 */
const copySourceFile = async (id: number, file: StorageFileReference) => {
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
    // This property seems to be incorrectly typed, see https://github.com/googleapis/nodejs-storage/issues/2389
    // In fact it is treated as the custom metadata only
    metadata: {
      // Keeping the source file metadata to preserve the `mtime`
      ...sourceFile.metadata.metadata,
      source: sourceFile.metadata.id,
    },
  });
};

const getMP3File = (id: number) =>
  getStorage()
    .bucket(functions.config().final?.public?.bucket)
    .file(`${id}.mp3`);

const deleteMP3File = (id: number): Promise<void> =>
  getMP3File(id)
    .delete({ ignoreNotFound: true })
    // Chaining to an empty `then` to ignore the result of the promise and return `Promise<void>`
    .then();

const PUBLICATION_TOPIC = 'publish';

export const publish = functions.pubsub
  .topic(PUBLICATION_TOPIC)
  .onPublish(async () => {
    const [fidelitySnapshot, audioRecords] = await Promise.all([
      getDatabase().ref('/FC/records').once('value'),
      directus.request(readItems('audios', { limit: -1 })),
    ]);

    const fidelityRecords = new Map(
      objectToIterableEntries(
        fidelitySnapshot.val() as Record<string, FidelityCheckRecord>
      )
    );

    const existingRecords = new Map(
      pipeSync(
        audioRecords,
        map((record) => [record.id, record])
      )
    );

    const operations = pipeSync(
      finalizeAudios(
        fidelityRecords,
        // Casting due to a typing issue in Directus
        audioRecords as AudioRecord[]
      ),
      map((record) => {
        const original = existingRecords.get(record.id);
        // Skipping records that have not changed
        if (original && util.isDeepStrictEqual(original, record)) return void 0;

        return Promise.all([
          record.status === 'active'
            ? copySourceFile(
                record.id,
                fidelityRecords.get(record.sourceFileId).file
              )
            : deleteMP3File(record.id),
          directus.request(
            original
              ? updateItem(
                  'audios',
                  original.id,
                  getDifference(original, record)
                )
              : createItem('audios', record)
          ),
        ]);
      })
    );

    // Limiting concurrent requests to the CMS.
    const CONCURRENCY = 20;

    // Awaiting for the first item of the one-item iterator emitted by `drain` in order to trigger the whole pipeline
    // See https://github.com/vitaly-t/iter-ops/discussions/230
    await pipeAsync(operations, waitRace(CONCURRENCY), drain()).catch(
      functions.logger.error
    ).first;
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
      +mp3File.metadata.size > 0 &&
      mp3File.metadata.metadata?.sourceMd5Hash === object.md5Hash
    )
      // MP3 file was created from the same source file, no need transcoding
      return functions.logger.info('MP3 file already exists');

    if (record.status !== 'active')
      return functions.logger.info(`Record ${id} is not active`);

    const uploadStream = mp3File.createWriteStream({
      resumable: false,
      metadata: {
        contentType: 'audio/mpeg',
        contentDisposition: contentDisposition(
          composeFileName(record as ActiveRecord)
        ),
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
        addMediaMetadata(composeMediaMetadata(record as ActiveRecord))
      ),
      finished(uploadStream),
    ]);
  });
