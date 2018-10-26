
const functions = require('firebase-functions');
var admin = require("firebase-admin");

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: functions.config().audioseva.database_url,
    storageBucket: functions.config().audioseva.storage_bucket
});

const bucket = admin.storage().bucket();
const db = admin.database();

//Functions
const importMp3IntoSQR = require('./src/importMp3IntoSQR');
const syncStorageToDB = require('./src/syncStorageToDB');

// Helper Functions
// 1. storeFileNameToDB( filePath, db_object )
const helpers = require('./helpers');


exports.importMP3IntoSQR = functions.storage.object().onFinalize( object => {
    return importMp3IntoSQR.handleNewUploads(object, db, helpers.storeFileNameToDB);
});


exports.syncStorageToDB = functions.https.onRequest((req, res) => {
    syncStorageToDB.handleCurrentlyUploadedFiles(bucket, db, helpers.storeFileNameToDB);
    syncStorageToDB.removeNonExistingMp3DBEntries(bucket, db, helpers.removeFileNameFromDB);
    return res.send(`Started Execution, the process is now Running in the background`);
});

