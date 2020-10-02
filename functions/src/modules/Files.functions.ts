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
import { Readable } from 'stream';
import { promisify } from 'util';
import { DateTimeConverter } from '../DateTimeConverter';
import { Spreadsheet } from '../Spreadsheet';
import { BucketName, StorageManager } from '../StorageManager';
import pMap = require('p-map');
import functions = require('firebase-functions');
import express = require('express');
import mm = require('musicmetadata');
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

interface FileMetadata {
  name: string;
  duration: number;
  size: number;
  updated: number;
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
const TOPIC_NAME = 'dump-duration';

export const scanFilesForDurationsDump = functions
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
      await pMap(files, async (file) => {
        try {
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
        } catch (error) {
          console.error(
            `Error triggering duration calculation for`,
            file.bucket.name,
            file.name,
            file.generation,
            file.metadata.md5Hash,
            'with reason:',
            error.message
          );
        }
      });
    });
  });

const mmAsync = promisify<Readable, MM.Options, MM.Metadata>(mm);

type GetAudioDuration = (file: File) => Promise<number>;

const audioDurationExtractionFunctions: Array<GetAudioDuration> = [
  // Using 'get-audio-duration'
  (file) => getAudioDurationInSeconds(file.createReadStream()),

  // Using 'musicmetadata'
  (file) =>
    mmAsync(file.createReadStream(), {
      duration: true,
      fileSize: file.metadata.size,
    }).then(({ duration }) => duration),

  // Downloading the whole file and using 'get-audio-duration'
  async (file) => {
    const filePath = path.join(os.tmpdir(), path.basename(file.name));
    await file.download({ destination: filePath });
    return getAudioDurationInSeconds(filePath).finally(() =>
      fs.unlinkSync(filePath)
    );
  },
];

const getAudioDuration = (file: File) =>
  audioDurationExtractionFunctions.reduce(
    (p, fn, index, all) =>
      // Chaining the next function to the failure branch of the previous one
      p.catch(() =>
        fn(file)
          // Logging the error message
          .catch((error) => {
            console.log(
              `Error getting audio duration`,
              `using method #${index + 1}/${all.length}`,
              'for',
              file.bucket.name,
              file.name,
              file.generation,
              file.metadata.md5Hash,
              'with reason:',
              error.message
            );
            throw error;
          })
          // Logging which method worked out
          .then((value) => {
            console.log(
              `Got duration using method #${index + 1}/${all.length}`,
              'for',
              file.bucket.name,
              file.name,
              file.generation,
              file.metadata.md5Hash
            );
            return value;
          })
      ),
    Promise.reject() // Initial rejected promise to trigger the first function
  );

export const saveMetadataIntoDatabase = functions
  .runWith({ memory: '1GB' })
  .pubsub.topic(TOPIC_NAME)
  .onPublish(async (message) => {
    const { bucketName, fileName, generation } = message.json;

    const file = admin
      .storage()
      .bucket(bucketName)
      .file(fileName, { generation });

    await file.getMetadata();

    try {
      const duration = await getAudioDuration(file);

      // Keeping the local variable for type checking
      const metadata: FileMetadata = {
        name: file.name,
        size: file.metadata.size,
        updated: new Date(file.metadata.updated).valueOf(),
        timeDeleted: file.metadata.timeDeleted,
        crc32c: file.metadata.crc32c,
        md5Hash: file.metadata.md5Hash,
        duration,
      };

      await getFileDurationLeaf(rootFilesMetadataRef, file).parent.set(
        metadata
      );
    } catch (error) {
      console.error(
        'Failed to get duration for',
        file.bucket.name,
        file.name,
        file.generation,
        file.metadata.md5Hash
      );
    }
  });

export const dumpDurationsToSpreadsheet = functions.pubsub
  .schedule('every day 04:00')
  .timeZone(functions.config().coordinator.timezone)
  .onRun(async () => {
    interface DurationsRow {
      'TEd/SEd': 'TEd' | 'SEd' | string;
      'File Name': string;
      Generation: number;
      Checksum: string;
      'Creation Date': number;
      'Deletion Date': number;
      Size: number;
      Duration: number;
    }

    const data = (await rootFilesMetadataRef.once('value')).val() as Dump;
    const rows = _.flatMap(Object.entries(data), ([bucketName, bucketData]) =>
      _(Object.entries(bucketData))
        // Only Track-edited files are of interest
        .filter(([fileName]) => /^[A-Z]+\d*-\d+-\d+$/.test(fileName))
        .flatMap(([fileName, fileData]) =>
          Object.entries(fileData).map<DurationsRow>(
            ([generation, metadata]) => ({
              'TEd/SEd':
                bucketName === 'edited'
                  ? 'TEd'
                  : bucketName === 'restored'
                  ? 'SEd'
                  : bucketName,
              'File Name': fileName,
              Generation: parseInt(generation),
              Checksum: metadata.crc32c,
              'Creation Date': DateTimeConverter.toSerialDate(
                DateTime.fromMillis(metadata.updated)
              ),
              'Deletion Date': metadata.timeDeleted
                ? DateTimeConverter.toSerialDate(
                    DateTime.fromMillis(metadata.timeDeleted)
                  )
                : null,
              Size: metadata.size,
              Duration: metadata.duration / 86400, // converting seconds into days
            })
          )
        )
        .value()
    );

    const sheet = await Spreadsheet.open<DurationsRow>(
      functions.config().te.spreadsheet.id,
      'Durations'
    );

    await sheet.overwriteRows(rows);
  });
