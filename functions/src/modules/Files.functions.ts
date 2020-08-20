/*!
 * sri sri guru gauranga jayatah
 */

import functions = require('firebase-functions');
import express = require('express');
import { DateTime } from 'luxon';
import { BucketName, StorageManager } from '../StorageManager';
import path = require('path');

const app = express();

app.get(
  '/download/:bucket(original|edited|restored)?/:fileName(\\w+-\\d+*)',
  async ({ params: { bucket, fileName } }, res) => {
    const baseName = path.basename(fileName, path.extname(fileName));

    const candidates = bucket
      ? /**
         * Bucket is specified in SE spreadsheets:
         * either `edited` or `original`.
         *
         * Edited DIGI files are sought as MP3 first, then as FLAC.
         */
        bucket === 'edited' && fileName.startsWith('DIGI')
        ? [
            StorageManager.getFile(bucket, `${baseName}.mp3`),
            StorageManager.getFile(bucket, `${baseName}.flac`),
          ]
        : [StorageManager.getFile(bucket as BucketName, fileName)]
      : /**
         * Links for CR and SQR phases do not include bucket,
         * as original files are supposed to be served.
         *
         * However files are sought in the `restored` bucket first (SE before CR cases)
         * and then in the `original` bucket.
         */
        [
          StorageManager.getFile('restored', fileName),
          StorageManager.getFile('original', fileName),
        ];

    const file = await StorageManager.findExistingFile(...candidates);

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
        promptSaveAs: `${baseName}${path.extname(file.name)}`,
      });
      console.log(`Redirecting ${bucket}/${fileName} to ${url}`);
      res.redirect(307, url);
    } else {
      console.warn(
        `File ${fileName} is not found${
          bucket ? ` in the ${bucket} bucket` : ''
        }.`
      );
      res
        .status(404)
        .send('File is not found, please contact the coordinator.');
    }
  }
);

export const download = functions.https.onRequest(app);
