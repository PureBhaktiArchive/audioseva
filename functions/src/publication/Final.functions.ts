/*!
 * sri sri guru gauranga jayatah
 */

import { createItem, readItem, readItems, updateItem } from '@directus/sdk';
import contentDisposition from 'content-disposition';
import { getDatabase } from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';
import * as functions from 'firebase-functions';
import { finished } from 'node:stream/promises';
import * as path from 'path';
import { FidelityCheckRecord } from '../FidelityCheck/FidelityCheckRecord';
import { RequireOnly } from '../RequireOnly';
import { StorageFileReference } from '../StorageFileReference';
import { StorageManager } from '../StorageManager';
import { objectToIterableEntries } from '../iterable-helpers';
import { getFileDurationPath, metadataCacheRef } from '../metadata-database';
import { AudioRecord } from './AudioRecord';
import { FinalRecord, NormalRecord } from './FinalRecord';
import { directus } from './directus';
import { createFinalRecords as generateFinalRecords } from './finalization';
import { composeFileName, composeMediaMetadata } from './metadata';
import { addMediaMetadata, convertToMp3, transcode } from './transcode';
import pMap = require('p-map');

const convertToFinalRecord = (record: AudioRecord): FinalRecord => ({
  id: record.id,
  taskId: record.sourceFileId,
  contentDetails: {
    title: record.title,
    topics: record.topics,
    date: record.date,
    dateUncertain: record.dateUncertain,
    timeOfDay: record.timeOfDay,
    location: record.location,
    locationUncertain: record.locationUncertain,
    category: record.category,
    languages: record.languages,
    percentage: record.percentage,
    otherSpeakers: record.otherSpeakers,
    soundQualityRating: record.soundQualityRating,
  },
});

const convertToAudioRecord = (
  record: FinalRecord,
  getDuration: (file: StorageFileReference) => number
): RequireOnly<AudioRecord, 'id'> => ({
  id: record.id,
  sourceFileId: record.taskId,
  ...('contentDetails' in record
    ? { status: 'active', ...record.contentDetails }
    : 'redirectTo' in record
      ? { status: 'redirect', redirectTo: record.redirectTo }
      : { status: 'inactive' }),
  duration: 'file' in record ? getDuration(record.file) : null,
});

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

const deleteFile = (id: number) =>
  getMP3File(id).delete({ ignoreNotFound: true });

/**
 * Upsert functionality is not yet available in Directus,
 * though being considered: https://github.com/directus/directus/discussions/5706
 * Until then we have to separately update and create.
 * @param record
 */
const saveToDirectus = (
  record: RequireOnly<AudioRecord, 'id'>,
  isExisting: boolean
) =>
  directus.request(
    isExisting
      ? updateItem('audios', record.id, record)
      : createItem('audios', record)
  );

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

    await pMap(
      generateFinalRecords(
        fidelityRecords,
        audioRecords.map(convertToFinalRecord)
      ),
      (record) =>
        Promise.all([
          'file' in record ? copyFile(record) : deleteFile(record.id),
          saveToDirectus(
            convertToAudioRecord(record, getDuration),
            existingFileIds.has(record.id)
          ),
        ]),
      { concurrency: 10 }
    ).catch(functions.logger.error);
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
