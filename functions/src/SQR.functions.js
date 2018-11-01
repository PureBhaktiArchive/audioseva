
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
//              Function --> sendEmailOnFileAllotment
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

exports.sendEmailOnFileAllotment = functions.database.ref('/sqr/allotments/{allotment_id}')
    .onUpdate((change, context) => {
        const old = change.before.val();
        const _new = change.after.val();        
        let coordinatorConfig = functions.config().coordinator;
        
        db.ref('/sqr/allotments').orderByChild('devotee/name')
        .equalTo(_new.devotee.emailAddress).once('value')
        .then(snapshot => {
            const allotments = snapshot.val();
            ////////////////
            // sending mail
            ///////////////
            if (!old.filesAlloted && _new.filesAlloted)
                if (_new.devotee)
                    if (_new.devotee.emailAddress) {
                        let date = new Date();
                        helpers.sendEmail(
                            _new.devotee.emailAddress, //email
                            [{ email: coordinatorConfig.email, name: coordinatorConfig.name }], //bcc
                            coordinatorConfig.templateid, //templateId
                            { //parameters
                                files: _new.files,
                                devotee: _new.devotee,
                                comment: _new.comment,
                                date: `${date.getUTCDate() + 1}.${date.getUTCMonth() + 1}`,
                                repeated: Object.keys(allotments).length > 1
                            }                    
                        );
                        return new_snapshot.ref.child('mailSent').set(true);
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
//              Function --> handleCurrentlyUploadedFiles
//
//      2. Remove DB entries for MP3s that don't exist
//              Function --> removeNonExistingMp3DBEntries
/////////////////////////////////////////////////


exports.importMP3IntoSQR = functions.storage.object().onFinalize( object => {
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
        })

        




        // Coordinator object example { templateid: 3, email:'a@a.a', name: 'Aj' }
        let coordinator = functions.config().coordinator;
        // 3. Notify the coordinator
        // 3.1 Get the submitted audio file data

        //  EXTRACTING the list name first from the file_name
        let list = helpers.extractListFromFilename(original.audio_file_name);
        
        db.ref(`/sqr/files/${list}/${original.audio_file_name}`).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                let fileData = snapshot.val();

                // 3.2 Get the devotee's Allotments in ('given' || 'WIP') state
                // Using the /sqr/files here instead of /sqr/allotmens to be able to check for the 
                // state of ('given' || 'WIP')
                db.ref(`/sqr/files`).once('value')
                .then(snapshot => {
                    if (snapshot.exists()) {
                        let devoteeAllotmentsSet = [];
                        let lists = snapshot.val();
                        for (let key in lists) {
                            let list = lists[key];
                            for (let key in list) {
                                let file = list[key];
                                if (file.allotment)
                                    if (file.allotment.devotee.emailAddress === original.email_address 
                                        && ['Given', 'WIP'].indexOf(file.status) > -1)
                                        devoteeAllotmentsSet.push(file);
                            }
                        }

                        // 3.3 checking if the First Submission or not
                        db.ref(`/sqr/submissions`).orderByChild('devotee/emailAddress')
                            .equalTo(original.email_address).once('value')
                        .then(snapshot => {
                            if (snapshot.exists()) {
                                let submissions = snapshot.val();

                                // Sending the notification Email Finally
                                helpers.sendEmail(
                                    coordinator.email,
                                    [{ email: coordinator.email, name: coordinator.name }],
                                    coordinator.templateid,
                                    {
                                        submission,
                                        fileData,
                                        devoteeAllotmentsSet,
                                        isFirstSubmission: Object.keys(submissions).length <= 1                                        
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
