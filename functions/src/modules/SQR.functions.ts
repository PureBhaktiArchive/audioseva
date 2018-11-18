import * as functions from 'firebase-functions';
import * as  admin from 'firebase-admin';

import { google } from "googleapis";
const GoogleSpreadsheet = require("google-spreadsheet");
import { promisify } from 'es6-promisify';
const lodash = require('lodash');

const bucket = admin.storage().bucket();
const db = admin.database();
import * as helpers from './../helpers';


/////////////////////////////////////////////////
//          OnNewAllotment (DB create and update Trigger)
//      1. Mark the files in the database --> { status: "Given" }
//              Function --> updateFilesOnNewAllotment
//
//      2. Send an email to the assignee to notify them of the new allotments
//              Function --> sendEmailOnNewAllotment
/////////////////////////////////////////////////
export const updateFilesOnNewAllotment = functions.database.ref('/sqr/allotments/{allotment_id}')
.onCreate((snapshot, context) => {
    const allotment = snapshot.val();
    let newDocKey = snapshot.key;

    // loop through the FILES array in the NEW ALLOTMENT object
    // and update their corresponding file objects
    allotment.files.forEach(async file => {
        let sqrRef = db.ref(`/files/${allotment.list}/${file}/soundQualityReporting`);
        
        let sqrError = await sqrRef.update({
            status: 'Given',
            assignee: allotment.assignee,
            timestampGiven: Math.round((new Date()).getTime() / 1000),
            timestampDone: null,
        });

        if (sqrError == undefined) { // if Successful FILE Update, update the ALLOTMENT accordingly

            // case 1 -- the allotmnet is read from the spreadsheet
            if (Object.keys(allotment).indexOf('sendNotificationEmail') > -1)
                db.ref(`/sqr/allotments/${newDocKey}`).update({ 
                    filesAlloted: true,
                });

            // case 2 -- the allotmnet is inputted manually
            else
                db.ref(`/sqr/allotments/${newDocKey}`).update({ 
                    filesAlloted: true,
                    sendNotificationEmail: true
                });
        }
    });

    return 1;
});

export const sendEmailOnNewAllotment = functions.database.ref('/sqr/allotments/{allotment_id}')
.onUpdate(async (change, context) => {
    const old = change.before.val();
    const newAllotment = change.after.val();        
    let coordinatorConfig = functions.config().coordinator;
    let templateId = functions.config().sqr.allotment.templateid;
    

    // Sends a notification to the assignee 
    // of the files he's allotted.
    let allotmentSnapshot = await db.ref('/sqr/allotments').orderByChild('assignee/emailAddress')
    .equalTo(newAllotment.assignee.emailAddress).once('value');

    const allotments = allotmentSnapshot.val();
    ////////////////
    // sending mail ( only if sendNotificationEmail is TRUE )
    //                        sendNotificationEmail is FASLE if the record is read from the spreadsheet
    ///////////////
    if (!old.filesAlloted && newAllotment.filesAlloted && newAllotment.assignee && newAllotment.sendNotificationEmail) {
        if (newAllotment.assignee.emailAddress) {
            console.log("Sending Mail")
            let date = new Date();
            let utcMsec = date.getTime() + (date.getTimezoneOffset() * 60000);
            let localDate = new Date( utcMsec + ( 3600000 * coordinatorConfig.timeZoneOffset ) );
            helpers.sendEmail(
                newAllotment.assignee.emailAddress, //to
                [{ email: coordinatorConfig.email_address }], //bcc
                templateId,
                {   //parameter list
                    files: newAllotment.files,
                    assignee: newAllotment.assignee,
                    comment: newAllotment.comment,
                    date: `${localDate.getDate() + 1}.${date.getMonth() + 1}`,
                    repeated: Object.keys(allotments).length > 1
                }                    
            );
            change.after.ref.child('mailSent').set(true).catch(err => console.log(err));
        }
    } else {
        console.log("Not Sending mail");
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


export const processSubmissions = functions.database.ref('/webforms/sqr/{submission_id}')
.onCreate(async (snapshot, context) => {
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
    const filesSnapshot = await db.ref(`/sqr/files/${original.list}/${original.audio_file_name}`).once('value');
    let allotmentUpdates = { status: audioFileStatus };
    // in case 1 & 2 add the comments to the notes
    if (audioFileStatus !== 'WIP')
        allotmentUpdates['notes'] = `${filesSnapshot.val().notes}\n${original.comments}`;
    // if the audio has a problem then REMOVE the devotee from the file allotment
    if (audioFileStatus === 'audioProblem')
        allotmentUpdates['devotee'] = {};
    db.ref(`/sqr/files/${original.list}/${original.audio_file_name}`).update(allotmentUpdates);



    // Coordinator object example { templateid: 3, email:'a@a.a', name: 'Aj' }
    let coordinator = functions.config().sqr.coordinator;
    let templateId = functions.config().sqr.allotment.templateid;
    // 3. Notify the coordinator
    // 3.1 Get the submitted audio file data

    //  EXTRACTING the list name first from the file_name
    let list = helpers.extractListFromFilename(original.audio_file_name);
    
    let fileSnapshot = await db.ref(`/sqr/files/${list}/${original.audio_file_name}`).once('value')

    if (fileSnapshot.exists()) {
        let fileData = fileSnapshot.val();

        /////////////////////////////////////////////////////////////
        //
        // 3.2 Get the devotee's Allotments in ('given' || 'WIP') state
        // TO BE ADDED LATER
        // Currently passing an empty array
        //
        /////////////////////////////////////////////////////////////

        // 3.3 checking if the First Submission or not
        let submissionSnapshot = await db.ref(`/sqr/submissions`).orderByChild('devotee/emailAddress')
        .equalTo(original.email_address).once('value');

        if (submissionSnapshot.exists()) {
            let submissions = submissionSnapshot.val();

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
    }
    
    return 1;
});


/////////////////////////////////////////////////
//          Import Submission and Allotments from a Spreadsheet(Http Triggered)
//
//      1. Parses a google spreadsheet
//      2. Looks for two sheets --> Allotments & Submissions
//      3. Loads their data into the equivalent Firebase database paths
/////////////////////////////////////////////////
export const importSpreadSheetData = functions.https.onRequest( async (req, res) => {
    const auth = await google.auth.getClient({
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
        
    const spreadsheetId = functions.config().sqr.spreadsheetId;
    const spreadsheet = new GoogleSpreadsheet(spreadsheetId);

    const token = await auth.getAccessToken();
    spreadsheet.setAuthToken(token);

    const getInfo = promisify(spreadsheet.getInfo);
    let data = await getInfo();

    let AllotmentsSheet, SubmissionsSheet;

    data.worksheets.forEach(worksheet => {
        if (worksheet.title === "Submissions") 
            SubmissionsSheet = worksheet;
        if (worksheet.title === "Allotments")
            AllotmentsSheet = worksheet;
    });

    const getSubmissions = promisify(SubmissionsSheet.getRows);
    
    // submissions = Submissions sheet rows
    const submissions = await getSubmissions();
    submissions.forEach(row => {
        let serial = row['submissionserial'];
        let submission = {
            author: {
                name: row['name'],
                emailAddress: row['emailAddress'],
            },
            fileName: row['audiofilename'],
            changed: row['changed'],
            completed: row['completed'],
            created: row['created'],
            comments: row['comments'],
            soundissues: row['soundissues'],
            soundqualityrating: row['soundqualityrating'],
            unwantedparts: row['unwantedparts'],
            duration: {
                beginning: new Date(row['beginning']).getTime() / 1000,
                ending:  new Date(row['ending']).getTime() / 1000,
            }
        };

        db.ref(`/sqr/submissions/${serial}`).set(submission);
    });


    const getAllotments = promisify(AllotmentsSheet.getRows);
    // alllotments = Allotments sheet rows
    const allotments = await getAllotments();
   
        
    // Grouping all the files allotted on one day under a single `Allotment Node` in the db

    // 1 Group by ASSIGNEEs
    let Assignees = lodash.groupBy(allotments, "devotee");

    // 2 Group by ASSIGNEEs/Dates
    let AssigneesDates = {};
    for (let i in Assignees)
        AssigneesDates[i] = lodash.groupBy(Assignees[i], "dategiven");

    // 3 Group by ASSIGNEEs/DATEs/LISTs
    let AssigneesDatesLists = {};
    for (let assignee in AssigneesDates) {
        AssigneesDatesLists[assignee] = {};
        for (let date in AssigneesDates[assignee])
            AssigneesDatesLists[assignee][date] = lodash.groupBy(AssigneesDates[assignee][date], "list")
    }

    // Adding the allotments
    for (let assignee in AssigneesDatesLists) {
        for (let date in AssigneesDatesLists[assignee]) {
            let dayFiles = [];
            for (let list in AssigneesDatesLists[assignee][date] ) {
                
                // Collecting all of the files on a list under a single day in an array
                AssigneesDatesLists[assignee][date][list].forEach(item => {
                    dayFiles.push(item['filename']);
                })
                
                let allotment = {
                    assignee: {
                        name: assignee,
                        emailAddress: Assignees[assignee][0]['email'],
                    },
                    files: dayFiles,
                    list,
                    timestamp: new Date(date).getTime() / 1000,
                    sendNotificationEmail: false, // Don't send emails if the document is read from the spreadsheet
                };

                db.ref(`/sqr/allotments`).push(allotment);
            }
        }
    }

    res.status(200).send(`Function was called successfully, check the Logs on Firebase to find out if something went wrong`);
});