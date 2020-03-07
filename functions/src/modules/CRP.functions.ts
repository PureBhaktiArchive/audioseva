/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { google } from 'googleapis';
import uuid = require('uuid');

export const watch = functions.https.onRequest(async (req, res) => {
  const auth = await google.auth.getClient({
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  const drive = google.drive({
    version: 'v3',
    auth,
  });

  const result = await drive.files.watch({
    fileId: '1UwqsIaJQx7EVerPxlh0ZHylygIndNSQelJzDqBamBYs',
    requestBody: {
      id: uuid.v4(),
      type: 'web_hook',
      address: 'https://app.dev.audioseva.com/crp/notification',
    },
  });
  console.log(result);
  res.send(result);
});

export const notification = functions.https.onRequest(async (req, res) => {
  console.log(req.headers);
  const auth = await google.auth.getClient({
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  const drive = google.drive({
    version: 'v3',
    auth,
  });

  res.send(200);
});
