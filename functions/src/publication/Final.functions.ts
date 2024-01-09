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
import { FinalRecord, NormalRecord } from './FinalRecord';
import { directus } from './directus';
import { createFinalRecords as generateFinalRecords } from './finalization';
import pMap = require('p-map');

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

    console.log('Got FC records:', fidelityRecords.size);

    // TODO: fetch duration
    const audioRecords = await directus.request(readItems('audios'));

    const copyFile = ({ id, file }: NormalRecord) =>
      getStorage()
        .bucket(file.bucket)
        .file(file.name, {
          generation: file.generation,
        })
        .copy(
          StorageManager.getBucket('final').file(
            `${id}${path.extname(file.name)}`
          ),
          {
            contentType: 'audio/flac',
            metadata: {
              metadata: {
                source: `${file.bucket}/${file.name}#${file.generation}`,
              },
            },
          }
        );

    const existingFileIds = new Set(audioRecords.map(({ id }) => id));
    /**
     * Upsert functionality is not yet available in Directus,
     * though being considered: https://github.com/directus/directus/discussions/5706
     * Until then we have to separately update and create.
     * @param record
     */
    const saveToDirectus = (record: AudioRecord) => {
      directus.request(
        existingFileIds.has(record.id)
          ? (console.log('updating', record.id),
            updateItem('audios', record.id, record))
          : (console.log('creating', record.id), createItem('audios', record))
      );
    };

    await pMap(
      generateFinalRecords(
        fidelityRecords,
        audioRecords.map(
          (record): FinalRecord => ({
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
          })
        )
      ),
      (record) =>
        Promise.all([
          // Copying the finalized file into a separate `final` bucket
          'file' in record ? copyFile(record) : void 0,
          'redirectTo' in record
            ? // Not saving redirect records to the CMS yet
              void 0
            : // Saving the record into the CMS
              saveToDirectus({
                id: record.id,
                sourceFileId: record.taskId,
                ...('contentDetails' in record
                  ? record.contentDetails
                  : // This is to clear all the corresponding fields in the CMS
                    emptyContentDetails),
              }),
        ]),
      { concurrency: 1 }
    ).catch(console.error);
  });
