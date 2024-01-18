/*!
 * sri sri guru gauranga jayatah
 */

import { createItem, readItems, updateItem } from '@directus/sdk';
import { getDatabase } from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';
import * as functions from 'firebase-functions';
import * as path from 'path';
import { FidelityCheckRecord } from '../FidelityCheck/FidelityCheckRecord';
import { RequireOnly } from '../RequireOnly';
import { StorageFileReference } from '../StorageFileReference';
import { StorageManager } from '../StorageManager';
import { getFileDurationPath, metadataCacheRef } from '../metadata-database';
import { makeIterable } from '../utils';
import { AudioRecord } from './AudioRecord';
import { FinalRecord, NormalRecord } from './FinalRecord';
import { directus } from './directus';
import { createFinalRecords as generateFinalRecords } from './finalization';
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
      makeIterable(
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
