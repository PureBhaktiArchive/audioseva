
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
const importCurrentMP3IntoSQR = require('./src/importCurrentMP3IntoSQR');

// Helper Functions
// 1. storeFileNameToDB( filePath, db_object )
const helpers = require('./helpers');


exports.importMP3IntoSQR = functions.storage.object().onFinalize( object => {
    return importMp3IntoSQR.handleNewUploads(object, db, helpers.storeFileNameToDB);
});


exports.importCurrentMP3IntoSQR = functions.https.onRequest((req, res) => {
    return importCurrentMP3IntoSQR.handleCurrentlyUploadedFiles(res, bucket, db, helpers.storeFileNameToDB);
});

