
const functions = require('firebase-functions');
const admin = require("firebase-admin");

const bucket = admin.storage().bucket();
const db = admin.database();
const helpers = require('./../helpers');


/////////////////////////////////////////////////
//          OnNewAllotment (DB create and update Trigger)
//      1. Mark the files in the database --> { status: "Given" }
//              Function --> UpdateFilesOnNewAllotment
//
//      2. Send an email to the devotee to notify them of the new allotments
//              Function --> sendEmailOnNewAllotment
/////////////////////////////////////////////////

exports.updateFilesOnNewAllotment = functions.database.ref('/sqr/allotments/{allotment_id}')
    .onCreate((snapshot, context) => {
        const original = snapshot.val();
        let newDocKey = snapshot.key;
        original.files.forEach(file => {
            let file_ref = db.ref(`/sqr/files/${original.list}/${file}`);
            file_ref.child("status").once('value')
            .then(snapshot => {
                if (snapshot.exists())
                    file_ref.update(
                        {
                            status: 'Given',
                            allotment: {
                                timestampGiven: new Date().getTime(),
                                timestampDone: null,
                                devotee: original.devotee
                            }
                        }, err => {
                            if (!err)
                                db.ref(`/sqr/allotments/${newDocKey}`).update({ filesAlloted: true });
                        });
                return 1;
            }).catch(err => console.log(err));
        });

        return 1;
});

exports.sendEmailOnNewAllotment = functions.database.ref('/sqr/allotments/{allotment_id}')
    .onUpdate((change, context) => {
        const old = change.before.val();
        const newAllotment = change.after.val();        
        let coordinatorConfig = functions.config().coordinator;
        let templateId = functions.config().sqr.allotment.templateid;
        

        // Sends a notification to the devotee 
        // of the files he's allotted.
        db.ref('/sqr/allotments').orderByChild('devotee/emailAddress')
        .equalTo(newAllotment.devotee.emailAddress).once('value')
        .then(snapshot => {
            const allotments = snapshot.val();
            ////////////////
            // sending mail
            ///////////////
            if (!old.filesAlloted && newAllotment.filesAlloted && newAllotment.devotee)
                if (newAllotment.devotee.emailAddress) {
                    let date = new Date();
                    let utcMsec = date.getTime() + (date.getTimezoneOffset() * 60000);
                    let localDate = new Date( utcMsec + ( 3600000 * coordinatorConfig.timeZoneOffset ) );
                    helpers.sendEmail(
                        newAllotment.devotee.emailAddress, //to
                        [{ email: coordinatorConfig.email_address }], //bcc
                        templateId,
                        { //parameters
                            files: newAllotment.files,
                            devotee: newAllotment.devotee,
                            comment: newAllotment.comment,
                            date: `${localDate.getDate() + 1}.${date.getMonth() + 1}`,
                            repeated: Object.keys(allotments).length > 1
                        }                    
                    );
                    return change.after.ref.child('mailSent').set(true);
                }
            return 1;
        }).catch(err => console.log(err));
        
        return 1;
});


/////////////////////////////////////////////////
//          Sync Storage to DB (HTTP Trigger)
//
//      1. Add the currently uploaded MP3s into the DB (handleCurrentlyUploadedFiles)
//
//      2. Remove DB entries for MP3s that don't exist (removeNonExistingMp3DBEntries)
/////////////////////////////////////////////////

exports.syncStorageToDB = functions.https.onRequest((req, res) => {
    ///////////////////////////////////////////////////////
    //      1. Add the currently uploaded MP3s into the DB
    ///////////////////////////////////////////////////////
    bucket.getFiles().then(files => {
        files.forEach(innerFilesObject => {
            innerFilesObject.forEach(file => {
                helpers.storeFileNameToDB(file.name, db);
            })
        });
        return 1;
    }).catch(err => console.log(err));

    ///////////////////////////////////////////////////////
    //      2. Remove DB entries for MP3s that don't exist
    ///////////////////////////////////////////////////////
    let ref = db.ref(`/sqr/files`);
    ref.once("value").then(filesSnapshot => {
        let files = filesSnapshot.val();
        for (let list in files) {
            for (let file in files[list]) {                
                bucket.file(`/mp3/${list}/${file}.mp3`).exists((err, exists) => {
                    if (err) console.log(err);
                    else if (!exists)  
                        if (files[list][file]) 
                            //removing should be done only if the `status` is `Spare`
                            if (files[list][file].status === 'Spare') {
                                helpers.removeFromDB(db, `/sqr/files/${list}/${file}`)
                            }
                });
            }
        }
        return 1;
    }).catch(err => console.log(err));

    return res.send(`Started Execution, the process is now Running in the background`);
});


/////////////////////////////////////////////////
//          Add MP3 name to DB (Storage Upload Trigger)
//
//      1. Add a newly MP3 name to the database
/////////////////////////////////////////////////


exports.importFilesFromStorage = functions.storage.object().onFinalize( object => {
    const filePath = object.name;
    
    if(helpers.checkValidMP3(filePath)){
        let ref = db.ref( helpers.createMP3DBRef(filePath, 'sqr') );
        //check if the file already exists in the RT db
        ref.child("status").once('value')
        .then(snapshot => {
            if (!snapshot.exists()) ref.set({status: "Spare"});
            else console.log("Existing");
            return 1;
        }).catch(err => console.log(err));
    }

    return 1;
});


/////////////////////////////////////////////////
//          SQR Submission Processing (DB create Trigger)
//
//      1. Add the webform data to a SQR submissions DB path
//      2. Update the allotment to reflect the current state of the audio file
//      3. Notifying the coordinator using a mail that holds the following information
//          3.1 the current submission information
//          3.2 the data of the file in the submission
//          3.3 the list of all the files alloted to the devotee of the current submission
//          3.4 a boolean value indicating whether this is the first submission of this devotee or not
//              Function --> processSubmissions
/////////////////////////////////////////////////


exports.processSubmissions = functions.database.ref('/webforms/sqr/{submission_id}')
    .onCreate((snapshot, context) => {
        const original = snapshot.val();

        let audioFileStatus = 'WIP';
        

        if (original.not_preferred_language) 
            audioFileStatus = 'Spare';        
        else if (original.unable_to_play_or_download)
            audioFileStatus = 'Audio Problem';
        

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



        // 2. Update the allotment ( first get the previous NOTES )
        db.ref(`/sqr/files/${original.list}/${original.audio_file_name}`).once('value')
        .then(snapshot => {
            let allotmentUpdates = { status: audioFileStatus };

            // in case 1 & 2 add the comments to the notes
            if (audioFileStatus !== 'WIP')
                allotmentUpdates.notes = `${snapshot.val().notes}\n${original.comments}`;
            
            // if the audio has a problem then REMOVE the devotee from the file allotment
            if (audioFileStatus === 'audioProblem')
                allotmentUpdates.devotee = {};

            db.ref(`/sqr/files/${original.list}/${original.audio_file_name}`).update(allotmentUpdates);
            return 1;
        }).catch(err => console.log(err));


        // Coordinator object example { templateid: 3, email:'a@a.a', name: 'Aj' }
        let coordinator = functions.config().sqr.coordinator;
        let templateId = functions.config().sqr.allotment.templateid;
        // 3. Notify the coordinator
        // 3.1 Get the submitted audio file data

        //  EXTRACTING the list name first from the file_name
        let list = helpers.extractListFromFilename(original.audio_file_name);
        
        db.ref(`/sqr/files/${list}/${original.audio_file_name}`).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                let fileData = snapshot.val();

                // 3.2 Get the devotee's Allotments in ('given' || 'WIP') state
                // TO BE ADDED LATER
                // Currently passing an empty array

                // 3.3 checking if the First Submission or not
                db.ref(`/sqr/submissions`).orderByChild('devotee/emailAddress')
                .equalTo(original.email_address).once('value')
                .then(snapshot => {
                    if (snapshot.exists()) {
                        let submissions = snapshot.val();

                        // Sending the notification Email Finally
                        helpers.sendEmail(
                            coordinator.email_address,
                            [{ email: coordinator.email }],
                            templateId,
                            {
                                submission,
                                fileData,
                                devoteeAllotmentsSet: [],
                                isFirstSubmission: Object.keys(submissions).length <= 1                                        
                            }
                        );
                    }                       
                    return 1;
                }).catch(err => console.log(err));
            }                    
            return 1;
        }).catch(err => console.log(err));

        
        return 1;

    });
