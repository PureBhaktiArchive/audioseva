/*!
 * sri sri guru gauranga jayatah
 */

import { PubSub } from '@google-cloud/pubsub';
import * as fs from 'fs';
import getAudioDurationInSeconds from 'get-audio-duration';
import { DateTime } from 'luxon';
import * as os from 'os';
import * as path from 'path';
import { DateTimeConverter } from '../DateTimeConverter';
import { Spreadsheet } from '../Spreadsheet';
import { StorageFileReference } from '../StorageFileReference';
import { BucketName, StorageManager } from '../StorageManager';
import { asyncHandler } from '../asyncHandler';
import { flatten } from '../flatten';
import {
  Dump,
  FileMetadataCache,
  getFileDurationPath,
  getFileMetadataPath,
  getMetadataCacheRef,
} from '../metadata-database';
import { modificationTime } from '../modification-time';
import pMap = require('p-map');
import functions = require('firebase-functions');
import express = require('express');
import admin = require('firebase-admin');
import _ = require('lodash');

const app = express();

app.get(
  '/download/:bucket(original|edited|restored)?/:fileName',
  asyncHandler(async ({ params: { bucket, fileName } }, res) => {
    try {
      const file = await StorageManager.getMostRecentFile(
        StorageManager.getCandidateFiles(fileName, bucket as BucketName)
      );

      if (file) {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: DateTime.local().plus({ days: 3 }).toJSDate(),
          /**
           * Intentionally using the requested file name,
           * because files have different name in the `original` bucket.
           *
           * However taking the extension from the found file,
           * as it may differ in case of DIGI files.
           *
           * Adding “SEd” suffix for restored files to visually distinguish them
           * and verify that the downloaded file was actually sound-engineered.
           */
          promptSaveAs: `${path.basename(fileName, path.extname(fileName))}${
            file.bucket.name.startsWith('restored') ? '.SEd' : ''
          }${path.extname(file.name)}`,
        });
        console.log(`Redirecting ${bucket}/${fileName} to ${url}`);
        res.redirect(307, url);
      } else {
        console.warn(
          `File ${fileName} is not found`,
          bucket ? `in the ${bucket} bucket` : ''
        );
        res
          .status(404)
          .send('File is not found, please contact the coordinator.');
      }
    } catch (error) {
      console.warn('Caught error:', error.message);
      res
        .status(500)
        .send('Error getting the file, please contact the coordinator.');
    }
  })
);

export const download = functions
  .runWith({ memory: '256MB' })
  .https.onRequest(app);

const pubsub = new PubSub();
const DURATION_EXTRACTION_TOPIC_NAME = 'extract-file-duration';

export const saveMetadataToDatabase = functions
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .pubsub.schedule('every day 23:00')
  .timeZone(functions.config().coordinator.timezone as string)
  .onRun(async () => {
    const snapshot = await getMetadataCacheRef().once('value');
    const updateAllMetadata = snapshot
      .child('updateAllMetadata')
      .val() as boolean;
    const updateAllDurations = snapshot
      .child('updateAllDurations')
      .val() as boolean;
    const removeNonExistent = snapshot
      .child('removeNonExistent')
      .val() as boolean;
    const durationExtractionTopic = pubsub.topic(
      DURATION_EXTRACTION_TOPIC_NAME
    );

    await pMap(['edited', 'restored'], async (bucketName: BucketName) => {
      const [allFiles] = await StorageManager.getBucket(bucketName).getFiles({
        versions: true,
      });

      // Skipping folder objects
      const files = allFiles.filter((file) => !file.name.endsWith('/'));

      const updates = files.reduce((accumulator, file) => {
        const path = getFileMetadataPath(file);
        if (!snapshot.child(path).exists() || updateAllMetadata) {
          const metadataForDatabase: FileMetadataCache = {
            name: file.name,
            size: +file.metadata.size,
            timeCreated: modificationTime(file).toMillis(),
            timeDeleted: file.metadata.timeDeleted
              ? new Date(file.metadata.timeDeleted as string).valueOf()
              : null,
            crc32c: file.metadata.crc32c,
            md5Hash: file.metadata.md5Hash,
          };
          flatten(metadataForDatabase, `${path}/`, accumulator);
        }
        return accumulator;
      }, {});

      if (removeNonExistent)
        snapshot.child(bucketName).forEach((fileSnapshot) =>
          fileSnapshot.forEach((generationSnapshot) => {
            if (
              !files.some(
                (file) =>
                  file.name === generationSnapshot.child('name').val() &&
                  file.generation === +generationSnapshot.key
              )
            )
              updates[
                `${bucketName}/${fileSnapshot.key}/${generationSnapshot.key}`
              ] = null;
          })
        );
      await Promise.all([
        // Triggering duration extraction
        pMap(
          files.filter(
            (file) =>
              !snapshot.child(getFileDurationPath(file)).exists() ||
              updateAllDurations
          ),
          (file) =>
            durationExtractionTopic.publishMessage({
              json: {
                bucket: file.bucket.name,
                name: file.name,
                generation: file.generation,
              } as StorageFileReference,
            })
        ),
        // Saving new metadata to the database
        getMetadataCacheRef().update(updates),
      ]);
    });
  });

export const extractDuration = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120 })
  .pubsub.topic(DURATION_EXTRACTION_TOPIC_NAME)
  .onPublish(async (message) => {
    const { bucket, name, generation } = message.json as StorageFileReference;

    const file = admin.storage().bucket(bucket).file(name, { generation });

    // Getting file metadata for `metadata.id` to work. Since some update, metadata doesn't get retrieved on `download`.
    await file.getMetadata();

    try {
      const filePath = path.join(os.tmpdir(), path.basename(file.name));
      await file.download({ destination: filePath });
      const duration = await getAudioDurationInSeconds(filePath).finally(() =>
        fs.unlinkSync(filePath)
      );

      console.log(`Got duration for ${file.metadata.id}: ${duration}`);

      await getMetadataCacheRef()
        .child(getFileDurationPath(file))
        .set(duration);
    } catch (error) {
      console.warn(
        `Failed to extract duration for ${file.metadata.id}`,
        `with message: ${error.message}`
      );
    }
  });

export const exportMetadataToSpreadsheet = functions.pubsub
  .schedule('every day 04:00')
  .timeZone(functions.config().coordinator.timezone as string)
  .onRun(async () => {
    type Source = 'SE' | 'TE' | 'Original';
    interface DurationsRow {
      'Source Bucket': Source;
      'File Name': string;
      Generation: string;
      Checksum: string;
      'Creation Date': number;
      'Deletion Date': number;
      'File Size': number;
      'Audio Duration': number;
    }

    const bucketToSourceMap = new Map<BucketName, Source>([
      ['original', 'Original'],
      ['restored', 'SE'],
      ['edited', 'TE'],
    ]);

    const data = (await getMetadataCacheRef().once('value')).val() as Dump;
    const rows = _(Object.entries(data))
      .flatMapDeep(([bucketName, bucketData]) =>
        Object.entries(bucketData).map(([fileName, fileData]) =>
          Object.entries(fileData).map<DurationsRow>(
            ([generation, metadata]) => ({
              'Source Bucket':
                bucketToSourceMap.get(bucketName as BucketName) || null,
              'File Name': fileName,
              Generation: generation,
              Checksum: metadata.crc32c || null,
              'Creation Date': DateTimeConverter.toSerialDate(
                DateTime.fromMillis(metadata.timeCreated)
              ),
              'Deletion Date': metadata.timeDeleted
                ? DateTimeConverter.toSerialDate(
                    DateTime.fromMillis(metadata.timeDeleted)
                  )
                : null,
              'File Size': metadata.size || null,
              'Audio Duration': metadata.duration / 86400 || null, // converting seconds into days
            })
          )
        )
      )
      .sortBy('File Name', 'Creation Date')
      .value();

    const sheet = await Spreadsheet.open<DurationsRow>(
      functions.config().te.spreadsheet.id as string,
      'Durations'
    );

    const result = await sheet.overwriteRows(rows);
    console.log(`Updated ${result?.updatedRows} rows.`);
  });
