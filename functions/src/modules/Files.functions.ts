import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as helpers from '../helpers';

const db = admin.database();


const originalBucket = `original.${functions.config().storage['root-domain']}`;
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

export const handleOriginalFileUploading = functions.storage
  .bucket(originalBucket)
  .object()
  .onFinalize(async object => {
    const filePath = object.name;
    const isValidFile = checkValidFile(filePath);
    if (!isValidFile)
      throw new Error(
        `File "${filePath}" is not uploaded to the appropriate folder`
      );

    const fileName = isValidFile[2] || isValidFile[4];
    const list = helpers.extractListFromFilename(fileName);

    const fileRef = db.ref(`/original/${list}/${fileName}`);

    await fileRef.update({
      [isValidFile[3] ? 'mp3Uploaded' : 'flacUploaded']: true,
    });

    return 1;
  });

export const handleOriginalFileDeletion = functions.storage
  .bucket(originalBucket)
  .object()
  .onDelete(async object => {
    const filePath = object.name;
    const nameParts = checkValidFile(filePath);
    if (!nameParts) {
      console.warn(`File: "${filePath}" was deleted.`);
      return -1;
    }

    const fileName = nameParts[2] || nameParts[4];
    const list = helpers.extractListFromFilename(fileName);
    const fileRef = db.ref(`/original/${list}/${fileName}`);

    return fileRef.update({
      [nameParts[3] ? 'mp3Uploaded' : 'flacUploaded']: false,
    });
  });

/**
 * syncStorageToDB
 * 1. Adds the currently uploaded audio files into the DB
 * 2. Removes DB entries for files that no longer exist in the storage
 */
export const syncStorageToDB = functions.https.onRequest(async (req, res) => {
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

    const fileRef = db.ref(`/original/${list}/${fileName}`);

    await fileRef.update({
      [parts[3] ? 'mp3Uploaded' : 'flacUploaded']: true,
    });
  });

  //  2.Remove DB entries for files that no longer exist
  const filesSnapshot = await db.ref(`/original`).once('value');
  const files = filesSnapshot.val();

  const bucketFileNames = bucketFilePaths.map(filePath => {
    const fileName = checkValidFile(filePath)[2];
    if (fileName) return fileName;
    else return checkValidFile(filePath)[4];
  });

  for (const list in files) {
    for (const fileName in files[list]) {
      if (bucketFileNames.indexOf(fileName) < 0)
        // **Found** in DB but not in STORAGE
        try {
          if (
            files[list][fileName]['soundQualityReporting'].status === 'Spare' &&
            files[list][fileName]['contentReporting'].status === 'Spare'
          )
            await db.ref(`/original/${list}/${fileName}`).remove();
        } catch (err) {
          console.warn(err);
        }
    }
  }
  return res.send(`Started Execution, Check the logs for any errors!`);
});
