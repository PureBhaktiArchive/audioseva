import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const bucket = admin.storage().bucket();
const db = admin.database();
import * as helpers from './../helpers';

///////////////////////////////////
//   Sync-Related Helper Functions
///////////////////////////////////

const checkValidMP3 = filePath =>
  filePath.startsWith('mp3/') && filePath.endsWith('.mp3');

const createMP3DBRef = filePath => {
  const parts = filePath.split('/');

  const list = parts[1];
  const mp3 = parts[2];
  let file_name = mp3.slice(0, -4);

  return `/files/${list}/${file_name}`;
};

/////////////////////////////////////////////////
//
//   Add MP3 name to DB (Storage Upload Trigger)
//
/////////////////////////////////////////////////

export const importFilesFromStorage = functions.storage
  .object()
  .onFinalize(object => {
    const filePath = object.name;
    if (!checkValidMP3(filePath)) return 1;

    let fileRef = db.ref(createMP3DBRef(filePath));

    fileRef.set({
      soundQualityReporting: { status: 'Spare' },
      contentReporting: { status: 'Spare' },
    });
    return 1;
  });

/////////////////////////////////////////////////
//          Sync Storage to DB (HTTP Trigger)
//
//      1. Add the currently uploaded MP3s into the DB (handleCurrentlyUploadedFiles)
//
//      2. Remove DB entries for MP3s that don't exist (removeNonExistingMp3DBEntries)
/////////////////////////////////////////////////
export const syncStorageToDB = functions.https.onRequest(async (req, res) => {
  ///////////////////////////////////////////////////////
  //      1. Add the currently uploaded MP3s into the DB
  ///////////////////////////////////////////////////////
  const bucketFiles = await bucket.getFiles();
  bucketFiles.forEach(innerFilesObject => {
    innerFilesObject.forEach(file => {
      if (!checkValidMP3(file.name)) return;

      let fileRef = db.ref(createMP3DBRef(file.name));

      fileRef.set({
        soundQualityReporting: { status: 'Spare' },
        contentReporting: { status: 'Spare' },
      });
    });
  });

  ///////////////////////////////////////////////////////
  //      2. Remove DB entries for MP3s that don't exist
  ///////////////////////////////////////////////////////
  const filesSnapshot = await db.ref(`/files`).once('value');
  let files = filesSnapshot.val();

  for (let list in files) {
    for (let file in files[list]) {
      const existingBucketFiles = await bucket
        .file(`/mp3/${list}/${file}.mp3`)
        .exists();

      // **Found** in DB but not in STORAGE
      // Removing should be done only if the `status` is `Spare`
      if (
        !existingBucketFiles[0] &&
        files[list][file]['soundQualityReporting'].status === 'Spare' &&
        files[list][file]['contentReporting'].status === 'Spare'
      ) {
        db.ref(`/files/${list}/${file}`)
          .remove()
          .then(() => console.log('Deleted.'))
          .catch(error => console.log(error));
      }
    }
  }

  return res.send(
    `Started Execution, the process is now Running in the background`
  );
});
