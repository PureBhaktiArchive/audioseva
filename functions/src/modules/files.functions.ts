import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const bucket = admin.storage().bucket();
const db = admin.database();

import * as helpers from '../helpers';
///////////////////////////////////
//   Sync-Related Helper Functions
///////////////////////////////////

const checkValidFile = filePath =>
  filePath.match(/(mp3\/(?:.*\/)*(.*)\.(mp3)|source\/(?:.*\/)*(.*)\.(flac))/);


/////////////////////////////////////////////////
//
//   Add MP3 name to DB (Storage Upload Trigger)
//
/////////////////////////////////////////////////

export const importFilesFromStorage = functions.storage
  .bucket(`original${functions.config().storage['root-domain']}`)
  .object()
  .onFinalize(object => {
    const filePath = object.name;
    const isValidFile = checkValidFile(filePath);
    if (!isValidFile)
      throw new Error(`File "${filePath}" is not uploaded to the appropriate folder`);

    const fileName = isValidFile[2] || isValidFile[4];
    const list = helpers.extractListFromFilename(fileName);

    const fileRef = db.ref(`/files/${list}/${fileName}`);

    fileRef.set({
      mp3Uploaded: isValidFile[3] ? true : false,
      flacUploaded: isValidFile[5] ? true : false,
    });
    return 1;
  });

export const HandleDeletedFiles = functions.storage
  .bucket(`original${functions.config().storage['root-domain']}`)
  .object()
  .onDelete(async object => {
    const filePath = object.name;
    const nameParts = checkValidFile(filePath);
    if (!nameParts) return -1;

    const fileName = nameParts[2] || nameParts[4];
    const list = helpers.extractListFromFilename(fileName);

    let uploadType;
    if (nameParts[3])
      uploadType = 'mp3Uploaded';
    else if (nameParts[5])
      uploadType = 'flacUploaded';

    const fileRef = db.ref(`/files/${list}/${fileName}`);

    let update = {};
    update[uploadType] = false;

    return fileRef.update(update);
  });


/**
 * syncStorageToDB 
 * 1. Adds the currently uploaded audio files into the DB
 * 2. Removes DB entries for files that no longer exist in the storage
 */
export const syncStorageToDB = functions.https
  .onRequest(async (req, res) => {

    //  1. Add the currently uploaded audio files into the DB
    const bucketFiles = await admin
      .storage()
      .bucket(`original${functions.config().storage['root-domain']}`)
      .getFiles();

    const bucketFilePaths = bucketFiles[0]
      .filter(file => checkValidFile(file.name))
      .map(file => file.name);

    bucketFilePaths.forEach(async filePath => {
      const parts = checkValidFile(filePath);
      const fileName = parts[2] || parts[4];
      const list = helpers.extractListFromFilename(fileName);

      const fileRef = db.ref(`/files/${list}/${fileName}`);

      fileRef.update({
        mp3Uploaded: parts[3] ? true : false,
        flacUploaded: parts[5] ? true : false,
      });
    });


    //  2.Remove DB entries for files that no longer exist
    const filesSnapshot = await db.ref(`/files`).once("value");
    const files = filesSnapshot.val();

    const bucketFileNames = bucketFilePaths
      .map(filePath => {
        const fileName = checkValidFile(filePath)[2];
        if (fileName)
          return fileName;
        else
          return checkValidFile(filePath)[4]
      });


    for (const list in files) {
      for (const fileName in files[list]) {
        if (bucketFileNames.indexOf(fileName) < 0) // **Found** in DB but not in STORAGE
          try {
            if (
              files[list][fileName]['soundQualityReporting'].status === 'Spare' &&
              files[list][fileName]['contentReporting'].status === 'Spare'
            )
              db.ref(`/files/${list}/${fileName}`)
                .remove();
          } catch (err) {
            console.warn(err)
          }
      }
    }
    return res.send(
      `Started Execution, Check the logs for any errors!`
    );
  });