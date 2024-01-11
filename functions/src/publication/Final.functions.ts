/*!
 * sri sri guru gauranga jayatah
 */

import { createItem, readItems, updateItem } from '@directus/sdk';
import { database } from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import * as functions from 'firebase-functions';
import * as path from 'path';
import { FinalContentDetails } from '../ContentDetails';
import { FidelityCheckRecord } from '../FidelityCheck/FidelityCheckRecord';
import { StorageManager } from '../StorageManager';
import { makeIterable } from '../utils';
import { AudioRecord } from './AudioRecord';
import { AssignmentRecord, FinalRecord, NormalRecord } from './FinalRecord';
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

const emptyContentDetails: FinalContentDetails = {
  title: null,
  category: null,
  date: null,
  dateUncertain: null,
  languages: null,
  location: null,
  locationUncertain: null,
  percentage: null,
  soundQualityRating: null,
  timeOfDay: null,
  topics: null,
  otherSpeakers: null,
};

const convertToAudioRecord = (
  record: AssignmentRecord | NormalRecord
): AudioRecord => ({
  id: record.id,
  sourceFileId: record.taskId,
  ...('contentDetails' in record
    ? record.contentDetails
    : // This is to clear all the corresponding fields in the CMS
      emptyContentDetails),
});

/**
 * Copies a finalized file into a dedicated bucket
 * @param record
 * @returns
 */
const finalizeFile = async ({ id, file }: NormalRecord) => {
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

/**
 * Upsert functionality is not yet available in Directus,
 * though being considered: https://github.com/directus/directus/discussions/5706
 * Until then we have to separately update and create.
 * @param record
 */
const saveToDirectus = (record: AudioRecord, isExisting: boolean) => (
  console.log(isExisting ? 'updating' : 'creating', record.id),
  directus.request(
    isExisting
      ? updateItem('audios', record.id, record)
      : createItem('audios', record)
  )
);

export const publish = functions.database
  .ref('/FC/publish/trigger')
  .onWrite(async () => {
    const fidelitySnapshot = await database().ref('/FC/records').once('value');
    if (!fidelitySnapshot.exists()) return;
    const fidelityRecords = new Map(
      makeIterable(
        fidelitySnapshot.val() as Record<string, FidelityCheckRecord>
      )
    );
    console.debug('Got FC records:', fidelityRecords.size);

    // TODO: fetch duration
    const audioRecords = await directus.request(
      readItems('audios', { limit: -1 })
    );
    console.debug('Got records from CMS:', audioRecords.length);

    const existingFileIds = new Set(audioRecords.map(({ id }) => id));

    await pMap(
      generateFinalRecords(
        fidelityRecords,
        audioRecords.map(convertToFinalRecord)
      ),
      (record) =>
        Promise.all([
          console.debug('Processing', record.id, record.taskId),
          'file' in record ? finalizeFile(record) : void 0,
          'redirectTo' in record
            ? void 0 // Not saving redirect records to the CMS yet
            : // Saving a record into the CMS
              saveToDirectus(
                convertToAudioRecord(record),
                existingFileIds.has(record.id)
              ),
        ]),
      { concurrency: 10 }
    ).catch(console.error);
  });
