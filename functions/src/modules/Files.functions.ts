/*!
 * sri sri guru gauranga jayatah
 */

import { File } from '@google-cloud/storage';
import { database } from 'firebase-admin';
import getAudioDurationInSeconds from 'get-audio-duration';
import { DateTime } from 'luxon';
import { Readable } from 'stream';
import { promisify } from 'util';
import { Spreadsheet } from '../Spreadsheet';
import { BucketName, StorageManager } from '../StorageManager';
import pProps = require('p-props');
import functions = require('firebase-functions');
import express = require('express');
import path = require('path');
import _ = require('lodash');
import mm = require('musicmetadata');

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

interface FileMetadata {
  duration: number;
  size: number;
  updated: number;
  crc32c: string;
  md5Hash: string;
}
type FileName = string;
type GenerationNumber = number;
type Dump = Record<
  BucketName,
  Record<FileName, Record<GenerationNumber, FileMetadata>>
>;

const getAudioMetadata = promisify<Readable, MM.Options, MM.Metadata>(mm);
const getAudioDuration = getAudioDurationInSeconds;

export const dumpMetadata = functions
  .runWith({ timeoutSeconds: 540 })
  .pubsub.schedule('every day 23:00')
  .timeZone(functions.config().coordinator.timezone)
  .onRun(async () => {
    const dbref = database().ref('files');
    const existingDump = (await dbref.once('value')).val() as Dump;

    const files = _(
      await Promise.all(
        ['edited', 'restored'].map(async (bucketName: BucketName) => {
          const [files] = await StorageManager.getBucket(bucketName).getFiles({
            versions: true,
          });
          return files;
        })
      )
    )
      .flatten()
      .take(200)
      .reduce<Record<string, File>>((accumulator, file) => {
        const shortBucketName = file.bucket.name.split('.')[0];
        const baseFileName = path.basename(file.name, path.extname(file.name));

        if (
          // Skipping folder objects
          !file.name.endsWith('/') &&
          // Skipping files for which the metadata is already dumped
          !existingDump?.[shortBucketName]?.[baseFileName]?.[file.generation]
            ?.duration
        )
          accumulator[
            `${shortBucketName}/${baseFileName}/${file.generation}`
          ] = file;
        return accumulator;
      }, {});

    const updates = await pProps(
      files,
      async (file) => {
        const { size, updated, crc32c, md5Hash } = file.metadata;

        const stream = file.createReadStream();
        stream.on('error', () => console.log('Error in stream', file.name));

        const { duration } = await getAudioDuration(stream).catch((error) => {
          console.error(
            `Error getting duration for ${file.bucket.name}/${file.name}#${file.generation} (${file.metadata.md5Hash})`,
            error.message
          );
          // If no duration is obtained, return null
          return null;
        });
        // const { duration } = await getAudioMetadata(stream, {
        //   duration: true,
        //   fileSize: size,
        // }).catch((error) => {
        //   console.error(
        //     `Error getting duration for ${file.bucket.name}/${file.name}#${file.generation} (${file.metadata.md5Hash})`,
        //     error.message
        //   );
        //   // If no duration is obtained, return null
        //   return { duration: null };
        // });

        return {
          name: file.name,
          size,
          updated: new Date(updated).valueOf(),
          crc32c,
          md5Hash,
          duration,
        };
      },
      { concurrency: 10, stopOnError: false }
    );

    await dbref.update(updates);
    interface DurationsRow {
      'File Name': string;
      Duration: number;
    }

    const sheet = await Spreadsheet.open<DurationsRow>(
      functions.config().te.spreadsheet.id,
      'Durations'
    );
  });
