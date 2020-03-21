/*!
 * sri sri guru gauranga jayatah
 */

import functions = require('firebase-functions');
import { StorageManager } from '../StorageManager';
import admin = require('firebase-admin');
import path = require('path');

export const arrangeUploadedFile = functions.storage
  .bucket(StorageManager.getFullBucketName('se.uploads'))
  .object()
  .onFinalize(async object => {
    const destinationFile = StorageManager.getDestinationFileForRestoredUpload(
      object.name
    );

    if (!destinationFile) {
      console.warn(`File name ${object.name} is not recognized, aborting.`);
      return;
    }

    if ((await destinationFile.exists()).shift()) {
      console.warn(
        `Desination file for ${object.name} already exists, aborting.`
      );
      return;
    }

    console.info(`Moving ${object.name} to ${destinationFile.name}`);
    await admin
      .storage()
      .bucket(object.bucket)
      .file(object.name)
      .move(destinationFile);
  });
