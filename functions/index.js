
const functions = require('firebase-functions');
var admin = require("firebase-admin");

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: functions.config().audioseva.database_url,
    storageBucket: functions.config().audioseva.storage_bucket
});


// for contacting the sendinblue API
var SibApiV3Sdk = require('sib-api-v3-sdk');

const sendInBlueSecretKey = functions.config().audioseva.send_in_blue.key;
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = sendInBlueSecretKey;

const bucket = admin.storage().bucket();
const db = admin.database();



//Functions
const importMp3IntoSQR = require('./src/importMp3IntoSQR');
const syncStorageToDB = require('./src/syncStorageToDB');
const allotments = require('./src/allotments');

// Helper Functions
const helpers = require('./helpers');


exports.importMP3IntoSQR = functions.storage.object().onFinalize( object => {
    return importMp3IntoSQR.handleNewUploads(object, db, helpers.storeFileNameToDB);
});

exports.syncStorageToDB = functions.https.onRequest((req, res) => {
    syncStorageToDB.handleCurrentlyUploadedFiles(bucket, db, helpers.storeFileNameToDB);
    syncStorageToDB.removeNonExistingMp3DBEntries(bucket, db, helpers.removeFileNameFromDB);
    return res.send(`Started Execution, the process is now Running in the background`);
});

///////////////////////////////////////////////////////////////////////////////////////////

exports.new_allotment = functions.database.ref('/sqr/allotments/{allotment_id}')
    .onCreate((snapshot, context) => {
        return allotments.UpdateFilesOnNewAllotment(
                snapshot, 
                db,
                helpers.updateFile
            );
    });

exports.sendEmailOnFileAllotment = functions.database.ref('/sqr/allotments/{allotment_id}')
    .onUpdate((change, context) => {
        const old = change.before.val();
        const _new = change.after.val();        
        
        allotments.sendEmailOnFileAllotment(old, _new, change.after, SibApiV3Sdk, helpers.sendEmail)
        return 1;
    });
