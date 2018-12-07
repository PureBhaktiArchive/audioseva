import * as functions from 'firebase-functions';
import * as  admin from 'firebase-admin';

import uniqid from 'uniqid';

const db = admin.database();


import { google } from "googleapis";
const GoogleSpreadsheet = require("google-spreadsheet");
import { promisify } from 'es6-promisify';


/////////////////////////////////////////////////
//          processNewAllotment (DB create Trigger)
//      1. Mark the task/s in the database as given --> { status: "Given" }
//      1. Set the task/s `assignee`, and `timestampGiven`
//
//      2. Send an email to the assignee to notify them of the new allotment
//
/////////////////////////////////////////////////
export const processNewAllotment = functions.database
.ref('/sound-editing/restoration/allotments/{pushId}').onCreate(async (snapshot, context) => {
    const coordinator = functions.config().coordinator;

    const allotment = snapshot.val();

    let timestamp = new Date(allotment.timestamp);

    //  1. Ensure sound editor's `uploadCode`
    let userRef = await db.ref('/users').orderByChild('emailAddress')
            .equalTo(allotment.assignee.emailAddress).once('value');
    if (!userRef.exists()) {
        console.warn("Assignee wasn't found!");
        return -1;
    }
    let user = userRef.val();
    let { uploadCode } = user;
    if (!uploadCode) {
        uploadCode = uniqid();
        userRef.ref.child('uploadCode').set({ uploadCode });
    }

    // 2. Update the task
    const { taskIds } = allotment;
    const tasks = [];
    taskIds.forEach(async taskId => {
        const regex = /(\w+)-(\d+)-(\d+)/g;
        let taskIdMatch = regex.exec(taskId);
        const list = taskIdMatch[1];

        await db.ref(`/sound-editing/tasks/${list}/${taskId}/restoration`).update({
            status: 'Given',
            assignee: allotment.assignee,
            timestampGiven: admin.database.ServerValue.TIMESTAMP,
        });

        // Getting the tasks list to be used when notifying the assignee (Step 3)
        const taskRef = await db.ref(`/sound-editing/tasks/${list}/${taskId}`).once('value');
        tasks.push(taskRef.val());
    });
    

    // Getting the list of allotments to check if the assignee was allotted before
    const allotmentsRef = await db.ref('/sound-editing/restoration/allotments').orderByChild('assignee/emailAddress')
                                .equalTo(allotment.assignee.emailAddress).once('value');
    const assigneeAllotments = allotmentsRef.val();

    
    // 3. Notify the assignee
    await db.ref(`/email/notifications`).push({
        template: 'sound-editing-allotment',
        to: allotment.assignee.emailAddress,
        bcc: [{ email: coordinator.email_address }],
        params: {
            tasks,
            assignee: allotment.assignee,
            comment: allotment.comment,
            date: `${timestamp.getDate()}.${timestamp.getMonth() + 1}`,
            uploadURL: `${functions.config().website.base_url}/sound-editing/upload/${uploadCode}`,
            repeated: Object.keys(assigneeAllotments).length > 1
        }
    });
    return 1;
});

export const importSpreadSheetData = functions.https.onRequest( async (req, res) => {

    const spreadsheetId = functions.config().se.spreadsheetId;
    const spreadsheet = new GoogleSpreadsheet(spreadsheetId);
    
    const useServiceAccountAuth = promisify(spreadsheet.useServiceAccountAuth);

    await useServiceAccountAuth(require('../creds.json'));
      
    const getInfo = promisify(spreadsheet.getInfo);
    let data = await getInfo();

    let sheets = [];

    for (let i = 0; i < data.worksheets.length; i++) {
        let getRows = promisify(data.worksheets[i].getRows);
        let rows = await getRows({ limit: 150 });
        
        if (    // checking if the main attributes exist
            rows[0] && 
            Object.keys(rows[0]).indexOf('beginning') > -1 &&
            Object.keys(rows[0]).indexOf('ending') > -1 
        ) { 
            sheets.push({ listName: data.worksheets[i].title, rows })
        }
    };

    let resolutions = ['ok', 'drop', 'duplicate', 'on_hold', 'reallot', 'repeat', 'derivative'];
    let resolution, fidCheckRes;

    let lastFile, addedChunks = 0, emptyValues = 0, misplaced = 0, noResolution = 0;

    for (let i = 0; i < sheets.length; i++) {
        let sheet = sheets[i];
        lastFile = { file_name: null,chunks: [], skip: false };
        for (let j = 0; j < sheet.rows.length; j++) {
            let row = sheet.rows[j];
            let skip = false;

            // Requirement #2 --> Misplaced audiofile entry
            if (row['audiofilename'].split('-')[0] != sheet.listName) {
                misplaced++;
                continue;
            }
            
            resolution = row['resolution'].toLowerCase().replace(' ', '_');
            fidCheckRes = row['fidelitycheckresolution'].toLowerCase().replace(' ', '_');

            // NOT READY to be imported
            if (resolutions.indexOf(resolution) < 0 || resolutions.indexOf(fidCheckRes) < 0) {
                noResolution++;
                skip = true;
            }

            if (row['beginning'] === '' || row['ending'] === '') {
                emptyValues++;
                continue;
            }            
            
            delete row['id'], delete row['_links'], delete row['save'],delete row['del'], delete row['_xml'];
            delete row['resolution'], delete row['fidelitycheckresolution'];

            if (row['continuationfrom'])
                row['continuationFrom'] = row['continuationfrom'];

            delete row['continuationfrom']
            

            if (lastFile.file_name === row['audiofilename']) {
                if (!skip)
                    lastFile.chunks.push(row);
            } else { // NEW FILE -- Save the previous Chunks and CLEAR
                if (lastFile.file_name != null && !lastFile.skip) {
                    addedChunks++;
                    await db.ref(`/sound-editing/chunks/${sheet.listName}/${lastFile.file_name}`)
                            .set(lastFile.chunks);
                }
                
                lastFile.file_name = row['audiofilename'];
                lastFile.chunks = [row];
                lastFile.skip = skip;
            }
        }
    }
    

    await db.ref(`/email/notifications`).push({
        template: 'importing-se-chunks',
        to: functions.config().coordinator.email_address,
        bcc: [{ email: functions.config().coordinator.email_address }],
        params: {
            addedChunks,
            emptyValues,
            noResolution,
        }
    });

    res.status(200).send(`Added chunks: ${addedChunks}, Records with empty values: ${emptyValues}, No resolution: ${noResolution}`);

});
