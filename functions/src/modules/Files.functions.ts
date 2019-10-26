/*!
 * sri sri guru gauranga jayatah
 */

import functions = require('firebase-functions');
import express = require('express');
import { standardizeFileName } from '../helpers';
import { StorageManager } from '../StorageManager';

const app = express();

app.get('/file/:bucket/:fileName', (req, res) =>
  res
    .status(307)
    .redirect(
      StorageManager.getPublicURL(
        StorageManager.getBucketName(req.params.bucket),
        standardizeFileName(req.params.fileName)
      )
    )
);

export const get = functions.https.onRequest(app);
