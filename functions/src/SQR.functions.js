
const functions = require('firebase-functions');
var admin = require("firebase-admin");

try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: functions.config().audioseva.database_url,
        storageBucket: functions.config().audioseva.storage_bucket
    });
} catch (err) { console.log(err) }


// for contacting the sendinblue API
var SibApiV3Sdk = require('sib-api-v3-sdk');

const sendInBlueSecretKey = functions.config().audioseva.send_in_blue.key;
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = sendInBlueSecretKey;

const bucket = admin.storage().bucket();
const db = admin.database();
const helpers = require('./../helpers');




const SQR_Helper = require('./SQR_Helper');
/////////////////////////////////////////////////
//          OnNewAllotment (DB create and update Trigger)
//      1. Mark the files in the database --> { status: "Given" }
//              Function --> UpdateFilesOnNewAllotment
//
//      2. Send an email to the devotee to notify them of the new allotments
//              Function --> sendEmailOnFileAllotment
/////////////////////////////////////////////////

exports.updateFilesOnNewAllotment = functions.database.ref('/sqr/allotments/{allotment_id}')
    .onCreate((snapshot, context) => {
        return SQR_Helper.UpdateFilesOnNewAllotment(
                snapshot, 
                db,
                helpers.updateFile
            );
});

exports.sendEmailOnFileAllotment = functions.database.ref('/sqr/allotments/{allotment_id}')
    .onUpdate((change, context) => {
        const old = change.before.val();
        const _new = change.after.val();        
        
        SQR_Helper.sendEmailOnFileAllotment(old, _new, change.after, SibApiV3Sdk, helpers.sendEmail)
        return 1;
});


/////////////////////////////////////////////////
//          Sync Storage to DB (HTTP Trigger)
//
//      1. Add the currently uploaded MP3s into the DB
//              Function --> handleCurrentlyUploadedFiles
//
//      2. Remove DB entries for MP3s that don't exist
//              Function --> removeNonExistingMp3DBEntries
/////////////////////////////////////////////////

exports.syncStorageToDB = functions.https.onRequest((req, res) => {
    SQR_Helper.handleCurrentlyUploadedFiles(bucket, db, helpers.storeFileNameToDB);
    SQR_Helper.removeNonExistingMp3DBEntries(bucket, db, helpers.removeFileNameFromDB);
    return res.send(`Started Execution, the process is now Running in the background`);
});


/////////////////////////////////////////////////
//          Add MP3 name to DB (Storage Upload Trigger)
//
//      1. Add a newly MP3 name to the database
//              Function --> handleCurrentlyUploadedFiles
//
//      2. Remove DB entries for MP3s that don't exist
//              Function --> removeNonExistingMp3DBEntries
/////////////////////////////////////////////////


exports.importMP3IntoSQR = functions.storage.object().onFinalize( object => {
    return SQR_Helper.handleNewUploads(object, db, helpers.storeFileNameToDB);
});