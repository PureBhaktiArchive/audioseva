/*!
 * sri sri guru gauranga jayatah
 */

import { PubSub } from '@google-cloud/pubsub';
import { File } from '@google-cloud/storage';
import { database } from 'firebase-admin';
import * as fs from 'fs';
import getAudioDurationInSeconds from 'get-audio-duration';
import { DateTime } from 'luxon';
import * as os from 'os';
import * as path from 'path';
import { DateTimeConverter } from '../DateTimeConverter';
import { Spreadsheet } from '../Spreadsheet';
import { BucketName, StorageManager } from '../StorageManager';
import pMap = require('p-map');
import functions = require('firebase-functions');
import express = require('express');
import admin = require('firebase-admin');
import _ = require('lodash');

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

const rootFilesMetadataRef = database().ref('files').child('metadata');
const getFileMetadataLeaf = <
  T extends database.Reference | database.DataSnapshot
>(
  root: T,
  file: File
): T =>
  root
    .child(file.bucket.name.split('.')[0])
    .child(path.basename(file.name, path.extname(file.name)))
    .child(file.generation.toString()) as T;

interface FileMetadata {
  name: string;
  duration?: number;
  size: number;
  timeCreated: number;
  timeDeleted?: number;
  crc32c: string;
  md5Hash: string;
}
type FileName = string;
type GenerationNumber = number;
type Dump = Record<
  BucketName,
  Record<FileName, Record<GenerationNumber, FileMetadata>>
>;

const pubsub = new PubSub();
const TOPIC_NAME = 'extract-file-duration';

export const saveMetadataToDatabase = functions
  .runWith({ timeoutSeconds: 120 })
  .pubsub.schedule('every day 23:00')
  .timeZone(functions.config().coordinator.timezone)
  .onRun(async () => {
    const snapshot = await rootFilesMetadataRef.once('value');
    const topic = pubsub.topic(TOPIC_NAME);

    async function processFile(file: File) {
      // Skipping folder objects
      if (file.name.endsWith('/')) return;

      const metadataSnapshot = getFileMetadataLeaf(snapshot, file);

      if (!metadataSnapshot.exists()) {
        // Keeping the local variable for type checking
        const metadataUpdate: FileMetadata = {
          name: file.name,
          size: file.metadata.size,
          timeCreated: new Date(file.metadata.timeCreated).valueOf(),
          timeDeleted: file.metadata.timeDeleted
            ? new Date(file.metadata.timeDeleted).valueOf()
            : null,
          crc32c: file.metadata.crc32c,
          md5Hash: file.metadata.md5Hash,
        };

        await metadataSnapshot.ref.update(metadataUpdate);
      }

      // Triggering duration extraction if it does not exist yet
      if (!metadataSnapshot.child('duration').exists())
        await topic.publishJSON({
          bucketName: file.bucket.name,
          fileName: file.name,
          generation: file.generation,
        });
    }

    await pMap(['edited', 'restored'], async (bucketName: BucketName) => {
      const [files] = await StorageManager.getBucket(bucketName).getFiles({
        versions: true,
      });

      try {
        await pMap(files, processFile, {
          concurrency: 1000,
          stopOnError: false,
        });
      } catch (error) {
        if (typeof error[Symbol.iterator] === 'function')
          for (const individualError of error) {
            console.error(individualError?.message);
          }
        else console.error(error.message);
      }
    });
  });

export const extractDuration = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120 })
  .pubsub.topic(TOPIC_NAME)
  .onPublish(async (message) => {
    const { bucketName, fileName, generation } = message.json;

    const file = admin
      .storage()
      .bucket(bucketName)
      .file(fileName, { generation });

    try {
      const filePath = path.join(os.tmpdir(), path.basename(file.name));
      await file.download({ destination: filePath });
      const duration = await getAudioDurationInSeconds(filePath).finally(() =>
        fs.unlinkSync(filePath)
      );

      await getFileMetadataLeaf(rootFilesMetadataRef, file)
        .child('duration')
        .set(duration);
    } catch (error) {
      console.error(
        `Failed to extract duration for ${file.metadata.id}`,
        `with message: ${error.message}`
      );
    }
  });

export const exportMetadataToSpreadsheet = functions.pubsub
  .schedule('every day 04:00')
  .timeZone(functions.config().coordinator.timezone)
  .onRun(async () => {
    interface DurationsRow {
      'SEd?': 'SEd' | 'Non-SEd';
      'File Name': string;
      Generation: string;
      Checksum: string;
      'Creation Date': number;
      'Deletion Date': number;
      'File Size': number;
      'Audio Duration': number;
    }

    const data = (await rootFilesMetadataRef.once('value')).val() as Dump;
    const rows = _.flatMap(Object.entries(data), ([bucketName, bucketData]) =>
      _(Object.entries(bucketData))
        // Only Track-edited files are of interest
        .filter(([fileName]) => /^[A-Z]+\d*-\d+-\d+$/.test(fileName))
        .flatMap(([fileName, fileData]) =>
          Object.entries(fileData).map<DurationsRow>(
            ([generation, metadata]) => ({
              'SEd?': bucketName === 'restored' ? 'SEd' : 'Non-SEd',
              'File Name': fileName,
              Generation: generation,
              Checksum: metadata.crc32c,
              'Creation Date': DateTimeConverter.toSerialDate(
                DateTime.fromMillis(metadata.timeCreated)
              ),
              'Deletion Date': metadata.timeDeleted
                ? DateTimeConverter.toSerialDate(
                    DateTime.fromMillis(metadata.timeDeleted)
                  )
                : null,
              'File Size': metadata.size,
              'Audio Duration': metadata.duration / 86400, // converting seconds into days
            })
          )
        )
        .sortBy('File Name', 'Creation Date')
        .value()
    );

    const sheet = await Spreadsheet.open<DurationsRow>(
      functions.config().te.spreadsheet.id,
      'Durations'
    );

    await sheet.overwriteRows(rows);
  });
