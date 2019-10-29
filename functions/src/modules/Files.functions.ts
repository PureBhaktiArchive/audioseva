/*!
 * sri sri guru gauranga jayatah
 */

import functions = require('firebase-functions');
import express = require('express');
import { standardizeFileName } from '../helpers';
import { StorageManager } from '../StorageManager';

const app = express();

app.get('/download/:bucket/:fileName', async (req, res) => {
  const file = StorageManager.getFile(
    <any>req.params.bucket,
    standardizeFileName(req.params.fileName)
  );
  if ((await file.exists())[0])
    res.redirect(307, StorageManager.getPublicURL(file));
  else
    res.status(404).send('File is not found, please contact the coordinator.');
});

export const download = functions.https.onRequest(app);
