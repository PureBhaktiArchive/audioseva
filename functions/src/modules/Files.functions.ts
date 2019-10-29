/*!
 * sri sri guru gauranga jayatah
 */

import functions = require('firebase-functions');
import express = require('express');
import { standardizeFileName } from '../helpers';
import { StorageManager } from '../StorageManager';

const app = express();

app.get('/download/:bucket/:fileName', (req, res) =>
  res
    .status(307)
    .redirect(
      StorageManager.getPublicURL(
        <any>req.params.bucket,
        standardizeFileName(req.params.fileName)
      )
    )
);

export const download = functions.https.onRequest(app);
