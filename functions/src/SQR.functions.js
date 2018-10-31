
const functions = require('firebase-functions');
const admin = require("firebase-admin");

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
        let coordinatorConfig = functions.config().audioseva.coordinator;
        
        SQR_Helper.sendEmailOnFileAllotment(coordinatorConfig, old, _new, change.after, helpers.sendEmail)
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
    return SQR_Helper.handleNewUploads(object, db, helpers);
});


/////////////////////////////////////////////////
//          Add MP3 name to DB (Storage Upload Trigger)
//
//      1. Add the webform data to a SQR submissions DB path
//      2. Update the allotment to reflect the current state of the audio file
//      3. Notifying the coordinator using a mail that holds the following information
//          3.1 the current submission information
//          3.2 the data of the file in the submission
//          3.3 the list of all the files alloted to the devotee of the current submission
//          3.4 a boolean value indicating whether this is the first submission of this devotee or not
//              Function --> removeNonExistingMp3DBEntries
/////////////////////////////////////////////////


exports.processSubmissions = functions.database.ref('/webforms/sqr/{submission_id}')
    .onCreate((snapshot, context) => {
        const original = snapshot.val();

        let audioFileStatus = 'WIP';
        

        if(original.cancellation) {
            audioFileStatus = original.cancellation.notPreferredLanguage === true ? 'Spare' : 'WIP';
            if(audioFileStatus === 'WIP')
                audioFileStatus = original.cancellation.audioProblem === true ? 'Audio Problem' : 'WIP';
        }
        

        // 1. Add the webform data to a SQR submissions DB path
        let submission = {
            fileName: original.audio_file_name,
            cancellation: {
                notPreferredLanguage: audioFileStatus === 'Spare',
                audioProblem: audioFileStatus === 'Audio Problem'
            },
            soundQualityRating: original.sound_quality_rating,
            unwantedParts: original.unwanted_parts,
            soundIssues: original.sound_issues,
            duration: {
                beginning: original.beginning,
                ending: original.ending,
            },
            comments: original.comments,
            token: original.token,
            created: original.created, 
            //  timestamp of the submission creation,
            // can differ from COMPLETED in case of saving a DRAFT and completing later.
            completed: original.completed, // timestamp of the submission completion.
            changed: original.changed, //timestamp of the submission update.
            devotee: {
                name: original.name,
                emailAddress: original.email_address
            }
        };
        db.ref(`/sqr/submissions/${original.serial}`).update(submission);



        // 2. Update the allotment
        let allotmentUpdates = { status: audioFileStatus };
        if (audioFileStatus !== 'WIP')
            allotmentUpdates.notes = original.comments;
        if(audioFileStatus !== 'Spare')
            allotmentUpdates.devotee = {};

        db.ref(`/sqr/files/${original.list}/${original.audio_file_name}`).update(allotmentUpdates);




        // Coordinator object example { templateid: 3, email:'a@a.a', name: 'Aj' }
        let coordinator = functions.config().audioseva.coordinator;
        // 3. Notify the coordinator
        // 3.1 Get the submitted audio file data
        db.ref(`/sqr/files/${original.list}/${original.audio_file_name}`).once('value')
        .then(snapshot => {
            if(snapshot.exists()) {
                let fileData = snapshot.val();

                // 3.2 Get the devotee's Allotments in ('given' || 'WIP') state
                // Using the /sqr/files here instead of /sqr/allotmens to be able to check for the 
                // state of ('given' || 'WIP')
                db.ref(`/sqr/files`).once('value')
                .then(snapshot => {
                    if(snapshot.exists()) {
                        let devoteeAllotmentsSet = [];
                        let lists = snapshot.val();
                        for (let key in lists) {
                            let list = lists[key];
                            for (let key in list) {
                                let file = list[key];
                                if (file.allotment)
                                    if(file.allotment.devotee.emailAddress === original.email_address 
                                        && ['Given', 'WIP'].indexOf(file.status) > -1)
                                        devoteeAllotmentsSet.push(file);
                            }
                        }

                        // 3.3 checking if the First Submission or not
                        let submissionNo = 0;
                        db.ref(`/sqr/submissions`).once('value')
                        .then(snapshot => {
                            if(snapshot.exists()) {
                                let submissions = snapshot.val();
                                for (let key in submissions) {
                                    let submission = submissions[key];
                                    if (submission.devotee)
                                        if(submission.devotee.emailAddress === original.email_address)
                                            submissionNo++;
                                }

                                // Sending the notification Email Finally
                                helpers.sendEmail(
                                    coordinator.email,
                                    [{ email: coordinator.email, name: coordinator.name }],
                                    coordinator.templateid,
                                    {
                                        submission,
                                        fileData,
                                        devoteeAllotmentsSet,
                                        isFirstSubmission: submissionNo <= 1                                        
                                    }
                                );
                            }                    
                            return 1;
                        }).catch(err => console.log(err));
                    }                    
                    return 1;
                }).catch(err => console.log(err));
            }                    
            return 1;
        }).catch(err => console.log(err));

        
        return 1;

    });
