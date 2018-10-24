
const functions = require('firebase-functions');
var admin = require("firebase-admin");

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: functions.config().audioseva.database_url,
    storageBucket: functions.config().audioseva.storage_bucket
});


// for contacting the sendinblue API
const request = require("request");



const sendInBlueSecretKey = functions.config().audioseva.send_in_blue.key;
const bucket = admin.storage().bucket();
const db = admin.database();



//Functions
const importMp3IntoSQR = require('./src/importMp3IntoSQR');
const importCurrentMP3IntoSQR = require('./src/importCurrentMP3IntoSQR');
const sendEmail = require('./src/sendEmail');

// Helper Functions
// 1. storeFileNameToDB( filePath, db_object )
const helpers = require('./helpers');


exports.importMP3IntoSQR = functions.storage.object().onFinalize( object => {
    return importMp3IntoSQR.handleNewUploads(object, db, helpers.storeFileNameToDB);
});


exports.importCurrentMP3IntoSQR = functions.https.onRequest((req, res) => {
    return importCurrentMP3IntoSQR.handleCurrentlyUploadedFiles(res, bucket, db, helpers.storeFileNameToDB);
});


exports.new_allotment = functions.database.ref('/sqr/allotments/{allotment_id}')
    .onCreate((snapshot, context) => {
        return sendEmail.sendEmailOnNewAllotment(snapshot, db, request, sendInBlueSecretKey, helpers.sendEmail);
    });