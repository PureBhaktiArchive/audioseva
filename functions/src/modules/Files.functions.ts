/*!
 * sri sri guru gauranga jayatah
 */

import { PubSub } from '@google-cloud/pubsub';
import { File } from '@google-cloud/storage';
import { database } from 'firebase-admin';
import getAudioDurationInSeconds from 'get-audio-duration';
import { DateTime } from 'luxon';
import { Readable } from 'stream';
import { promisify } from 'util';
import { Spreadsheet } from '../Spreadsheet';
import { BucketName, StorageManager } from '../StorageManager';
import functions = require('firebase-functions');
import express = require('express');
import path = require('path');
import mm = require('musicmetadata');
import admin = require('firebase-admin');
import pMap = require('p-map');

const app = express();

app.get(
  '/download/:bucket(original|edited|restored)?/:fileName',
  async ({ params: { bucket, fileName } }, res) => {
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
           */
          promptSaveAs: `${path.basename(
            fileName,
            path.extname(fileName)
          )}${path.extname(file.name)}`,
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
  }
);

export const download = functions
  .runWith({ memory: '128MB' })
  .https.onRequest(app);

// interface FileMetadata {
//   duration: number;
//   size: number;
//   updated: number;
//   crc32c: string;
//   md5Hash: string;
// }
// type FileName = string;
// type GenerationNumber = number;
// type Dump = Record<
//   BucketName,
//   Record<FileName, Record<GenerationNumber, FileMetadata>>
// >;

const rootFilesMetadataRef = database().ref('files');
const getFileDurationLeaf = <
  T extends database.Reference | database.DataSnapshot
>(
  root: T,
  file: File
): T =>
  root
    .child(file.bucket.name.split('.')[0])
    .child(path.basename(file.name, path.extname(file.name)))
    .child(file.generation.toString())
    .child('duration') as T;

const pubsub = new PubSub();
const TOPIC_NAME = 'dump-duration';

export const enqueueFilesDurationsExtraction = functions
  .runWith({ timeoutSeconds: 120 })
  .pubsub.schedule('every day 23:00')
  .timeZone(functions.config().coordinator.timezone)
  .onRun(async () => {
    const snapshot = await rootFilesMetadataRef.once('value');
    const topic = pubsub.topic(TOPIC_NAME);

    await pMap(['edited', 'restored'], async (bucketName: BucketName) => {
      const [files] = await StorageManager.getBucket(bucketName).getFiles({
        versions: true,
      });
      await pMap(files.slice(0, 200), async (file) => {
        if (
          // Skipping folder objects
          !file.name.endsWith('/') &&
          // Skipping files for which the duration is already dumped
          !getFileDurationLeaf(snapshot, file).exists()
        )
          await topic.publishJSON({
            bucketName: file.bucket.name,
            fileName: file.name,
            generation: file.generation,
          });
      });
    });
  });

const mmAsync = promisify<Readable, MM.Options, MM.Metadata>(mm);
const getAudioDurationUsingMM = (stream: Readable, fileSize: number) =>
  mmAsync(stream, {
    duration: true,
    fileSize,
  }).then(({ duration }) => duration);

export const dumpDuration = functions.pubsub
  .topic(TOPIC_NAME)
  .onPublish(async (message, context) => {
    const { bucketName, fileName, generation } = message.json;

    const file = admin
      .storage()
      .bucket(bucketName)
      .file(fileName, { generation });

    await file.getMetadata();

    const { size, updated, crc32c, md5Hash } = file.metadata;

    const stream = file.createReadStream();
    stream.on('error', (error) =>
      console.error(
        'Error in stream',
        file.bucket.name,
        file.name,
        file.generation,
        error.message
      )
    );

    try {
      console.log(
        `Trying to get audio duration for ${file.bucket.name}/${file.name}#${file.generation} (${file.metadata.md5Hash})`
      );
      const duration =
        (await getAudioDurationInSeconds(stream).catch(() => null)) ||
        (await getAudioDurationUsingMM(stream, size).catch(() => null));

      await getFileDurationLeaf(rootFilesMetadataRef, file).parent.set({
        name: file.name,
        size,
        updated: new Date(updated).valueOf(),
        crc32c,
        md5Hash,
        duration,
      });
    } catch (error) {
      console.error('Error getting audio duration', error.message);
    }
  });

export const dumpDurationsToSpreadsheet = functions.pubsub
  .schedule('every day 04:00')
  .timeZone(functions.config().coordinator.timezone)
  .onRun(async () => {
    interface DurationsRow {
      'File Name': string;
      Duration: number;
    }

    const sheet = await Spreadsheet.open<DurationsRow>(
      functions.config().te.spreadsheet.id,
      'Durations'
    );
  });
