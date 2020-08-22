/*!
 * sri sri guru gauranga jayatah
 */

import functions = require('firebase-functions');
import { StorageManager } from '../StorageManager';
import admin = require('firebase-admin');

export const arrangeUploadedFile = functions.storage
  .bucket(StorageManager.getFullBucketName('se.uploads'))
  .object()
  .onFinalize(async (object) => {
    const uploadedFile = admin
      .storage()
      .bucket(object.bucket)
      .file(object.name);

    const destinationFile = StorageManager.getDestinationFileForRestoredUpload(
      object.name
    );

    if (!destinationFile) {
      console.warn(`File name ${object.name} is not recognized, aborting.`);
      return;
    }

    const [exists] = await destinationFile.exists();

    if (exists) {
      const [sourceStillExists] = await uploadedFile.exists();
      if (!sourceStillExists) {
        console.log(`File ${object.name} seems to be already arranged.`);
        return;
      }
    }

    console.info(
      `Moving ${object.name} to ${destinationFile.name}.`,
      exists ? 'Overwriting' : null
    );

    try {
      await uploadedFile.move(destinationFile);
    } catch (error) {
      console.error(error);
    }
  });
