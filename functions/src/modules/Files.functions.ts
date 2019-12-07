/*!
 * sri sri guru gauranga jayatah
 */

import functions = require('firebase-functions');
import express = require('express');
import { DateTime } from 'luxon';
import { StorageManager } from '../StorageManager';

const app = express();

app.get(
  ['/download/:bucket/:fileName', '/download/:fileName'],
  async (req, res) => {
    const file = StorageManager.findFile(req.params.fileName);

    if (file) {
      const url = (
        await file.getSignedUrl({
          action: 'read',
          expires: DateTime.local()
            .plus({ days: 3 })
            .toJSDate(),
          promptSaveAs: req.params.fileName,
        })
      )[0];
      console.log(`Redirecting ${req.params.fileName} to ${url}`);
      res.redirect(307, url);
    } else {
      console.warn(
        `File ${file.name} is not found in ${file.bucket.name} bucket.`
      );
      res
        .status(404)
        .send('File is not found, please contact the coordinator.');
    }
  }
);

export const download = functions.https.onRequest(app);
