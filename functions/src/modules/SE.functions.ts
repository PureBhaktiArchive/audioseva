import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import uniqid from 'uniqid';
import { google } from "googleapis";
const lodash = require('lodash');
import * as moment from 'moment';

import * as helpers from './../helpers';

const db = admin.database();

/////////////////////////////////////////////////
//          processNewAllotment (DB create Trigger)
//      1. Mark the task/s in the database as given --> { status: "Given" }
//      1. Set the task/s `assignee`, and `timestampGiven`
//
//      2. Send an email to the assignee to notify them of the new allotment
//
/////////////////////////////////////////////////
export const processNewAllotment = functions.database
  .ref('/sound-editing/restoration/allotments/{pushId}')
  .onCreate(async (snapshot, context) => {
    const coordinator = functions.config().coordinator;

    const allotment = snapshot.val();

    const timestamp = new Date(allotment.timestamp);

    //  1. Ensure sound editor's `uploadCode`
    const userRef = await db
      .ref('/users')
      .orderByChild('emailAddress')
      .equalTo(allotment.assignee.emailAddress)
      .once('value');
    if (!userRef.exists()) {
      console.warn("Assignee wasn't found!");
      return -1;
    }
    const user = userRef.val();
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
      const taskIdMatch = regex.exec(taskId);
      const list = taskIdMatch[1];

      await db
        .ref(`/sound-editing/tasks/${list}/${taskId}/restoration`)
        .update({
          status: 'Given',
          assignee: allotment.assignee,
          timestampGiven: admin.database.ServerValue.TIMESTAMP,
        });

      // Getting the tasks list to be used when notifying the assignee (Step 3)
      const taskRef = await db
        .ref(`/sound-editing/tasks/${list}/${taskId}`)
        .once('value');
      tasks.push(taskRef.val());
    });

    // Getting the list of allotments to check if the assignee was allotted before
    const allotmentsRef = await db
      .ref('/sound-editing/restoration/allotments')
      .orderByChild('assignee/emailAddress')
      .equalTo(allotment.assignee.emailAddress)
      .once('value');
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
        uploadURL: `${
          functions.config().website.base_url
        }/sound-editing/upload/${uploadCode}`,
        repeated: Object.keys(assigneeAllotments).length > 1,
      },
    });
    return 1;
  });



const validateSpreadsheetRow = (row, summary, sheetTitle) => {
    let resolutions = ['ok', 'drop', 'duplicate', 'on hold', 'reallot', 'repeat', 'derivative'];
    let resolution, fidCheckRes; // variables to hold values of Res and fidRes when looping through the rows

    let _import = false;
 

    // [CHECK #1] File name belongs to the list identified by the sheet name       
    if (helpers.extractListFromFilename(row['Audio File Name']) != sheetTitle) {
        console.log("File name belongs to a different list.");
        summary.misplaced.push({
            audioFileName: row['Audio File Name'],
            listName: sheetTitle,
            errorMessage: `File name belongs to a different list.`
        });
    }

    resolution = row['Resolution'];
    fidCheckRes = row['Fidelity Check Resolution'];

    if (resolution && fidCheckRes) {
        resolution = resolution.toLowerCase();
        fidCheckRes = fidCheckRes.toLowerCase();

        // [CHECK #2] Both resolutions belong to the list of resolutions, case-insensitively.
        if (resolutions.indexOf(resolution) < 0 || resolutions.indexOf(fidCheckRes) < 0) {
            console.log(`Audio file name: ${row['Audio File Name']} -- Error: Resolution, or Fidelity check resolution values isn't valid`);
            summary.invalidResoultion.push({
                audioFileName: row['Audio File Name'],
                resolution,
                fidCheckRes,
                errorMessage: `Resolution, or Fidelity check resolution values isn't valid.`
            });
        }

        // [CHECK #3] Resolution and Fidelity Check Resolution should be equal, case-insensitively.
        if (resolution !== fidCheckRes) {
            console.log(`Audio file name: ${row['Audio File Name']} -- Error: Mismatch in Resolution and Fidelity check resolution values.`);
            summary.mismatchedResolutions.push({
                audioFileName: row['Audio File Name'],
                resolution,
                fidCheckRes,
                errorMessage: `Mismatch in Resolution and Fidelity check resolution values.`
            });
        }

        // [CHECK #6] Beginning and Ending should be filled for rows with Resolution equal to `OK`.
        if (resolution === 'ok') {
            _import = true;
        }

    } else // [Filter criterion #1] Rows not having (Resolution, or Fidelity check resolutin) are skipped SILENTLY
        summary.noResolution.push({ audioFileName: row['Audio File Name'], resolution, fidCheckRes });

    return _import;
}



export const importChunks = functions.runWith({
    timeoutSeconds: 300,
    memory: '2GB'
}).pubsub.topic('daily-tick').onPublish(async (message) => {
    const auth = await google.auth.getClient({
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = functions.config().reporting.content.processing.spreadsheet_id;
    let sheetscMetadata  = await helpers.buildSheetIndex(sheets, spreadsheetId);


    let currentFile, // used to increment the chunks of an audiofile coming from multiple rows into a single object
        summary = {
            addedChunks: 0, 
            misplaced: [], 
            noResolution: [], // rows with No `Resolution` or No `FidelityCheckResolution` values
            invalidResoultion: [],
            mismatchedResolutions: [],
            overlappingChunks: [], // Chunks with overlapping times
            modified: [] // Rows already found in the DB
        };

    
    sheetscMetadata.forEach(async sheet => {
        if (sheet.firstRow.indexOf('Beginning') < 0 || sheet.firstRow.indexOf('Ending') < 0) 
            return;

        let rows = await helpers.getSheetRows(sheet, sheets, spreadsheetId, sheet.firstRow);
        
        let chunks = {};
        currentFile = { 
            file_name: null,
            chunks: [], 
            skip: false, 
            track: null 
        };

        ////////////////////////////////////////
        //  
        //  1. loop through all the rows in the current sheet
        //  2. Apply the following checks and if something wrong is found
        //      increment the corresonding error attribute in the `summary` object
        //      [CHECKS]
        //          A. Misplaced files
        //          B. Non-existence of `Resolution` values in a row
        //          C. Empty values in either `Beginning` or `Ending` attributes
        //
        ////////////////////////////////////////
        for (const row of rows) {

            let _import = validateSpreadsheetRow(row, summary, sheet.title);            
            
            const AudioFileName = row['Audio File Name'];
            const continuationFrom = row['Continuation From'];

            const chunkToStore = {
                beginning: moment.duration(row['Beginning']).asSeconds(),
                ending: moment.duration(row['Ending']).asSeconds(),
                continuationFrom,
                contentReporting: {
                    date: row['Date'],
                    locatioon: row['Location'],
                    category: row['Category'],
                    topics: row['Topics'],
                    gurudevaTimings: row['Gurudeva Timings'],
                    otherSpeakers: row['Other Speakers'],
                    kirtan: row['Kirtan'],
                    abruptLecture: row['Abrupt Lecture'],
                    suggestedTitle: row['Suggested Title'],
                    languages: row['Languages'],
                    soundQualityRating: row['Sound Quality'],
                    soundIssues: row['Sound Issues'],
                    comments: row['Comments'],
                    submissionTimestamp: row['Timestamp'],
                    submissionSerial: row['Submission Serial'],
                },
                importTimestamp: admin.database.ServerValue.TIMESTAMP,
                processingResolution: row['Resolution'],
                _import
            };


            
            // Same file name --> add newly read chunk (row) to the `currentFile` object
            if (currentFile.file_name === AudioFileName) 
                currentFile.chunks.push(chunkToStore);
            
            // NEW FILE --> Save old file AND add the newly read chunk to `currentFile` object            
            else {
                if (currentFile.file_name != null) {

                    // if file object exists, add the chunks to it
                    if (chunks[currentFile.file_name]) 
                        chunks[currentFile.file_name].push(currentFile.chunks)

                    // if this is the first occurence of the file, set its value to the list of chunks 
                    else    
                        chunks[currentFile.file_name] = currentFile.chunks;
                }

                currentFile.file_name = AudioFileName;
                currentFile.chunks = [chunkToStore];
            }                    
        }
        

        ////////////////////////////////
        // Processing Sheet Audio Files
        ////////////////////////////////

        Object.keys(chunks).forEach(async fileName => {
            let currentFilechunks = chunks[fileName];

            // Sorting by `beginning` time
            currentFilechunks = await lodash.orderBy(currentFilechunks, ['beginning'], ['asc']);
            // console.log(currentFilechunks);

            let chunksToImport = [];
            ////////////////////////////////////////////
            // [CHECK #5] Chunks of a single audio file 
            // should not overlap each other in timing.
            ////////////////////////////////////////////
            let lastEndingTime = null;
            currentFilechunks.forEach((chunk, i) => {


                // `Beginning` value should be less than `Ending`.
                if (chunk.beginning > chunk.ending) {
                    console.log(`Audio file name: ${fileName} -- Error: "Beginning" value isn't less than "Ending".`);
                    summary.overlappingChunks.push({
                        audioFileName: fileName,
                        beginning: chunk.beginning,
                        ending: chunk.ending,
                        errorMessage: `"Beginning" value isn't less than "Ending".`
                    });
                }

                // `beginning` of the CURRENT chunk should be GREATER than the `ending` of the LAST chunk
                if (i !== 0 && chunk.beginning && lastEndingTime && chunk.beginning < lastEndingTime) {
                    console.log(`Audio file name: ${fileName} -- Error: Overlapping chunks.`);
                    summary.overlappingChunks.push({
                        audioFileName: fileName,
                        errorMessage: `Overlapping chunks.`
                    });
                }


                // setting the value of `lastEndingTime` to be used in the next iteration
                if (chunk.ending)
                    lastEndingTime = chunk.ending;
                else
                    lastEndingTime = null;


                //////////////////////////////////////////////////
                // [CHECK #4] `continuationFrom` column should
                // be filled only for the first chunk of the track.
                //////////////////////////////////////////////////
                if (chunk.continuationFrom && i !== 0)
                    delete chunk.continuationFrom;

                
                // importing only chunks with `_import` flag set to true
                if (chunk._import) {
                    delete chunk._import;
                    chunksToImport.push(chunk);
                }
            });
            

            summary.addedChunks += chunksToImport.length;

            //////////////////////////////////////
            // Ensuring data is NEVER overwritten
            //////////////////////////////////////
            const dbRef = `/sound-editing/chunks/${sheet.title}/${fileName.split(' ')[0]}`;
            
            const ref = await db.ref(dbRef).once('value');

            if (!ref.exists())
                await db.ref(dbRef).set(chunksToImport);
            else {
                const dbChunks = ref.val();
                dbChunks.forEach((dbChunk, i) => {                   
                    // Instead of comparing every single attribute,
                    // the two chunk object are converted into strings and then compared
                    if (JSON.stringify(dbChunk) != JSON.stringify(currentFilechunks[i])) {
                        summary.modified.push({
                            audioFileName: fileName,
                            dbChunk: dbChunks,
                            importedChunk: currentFilechunks
                        });
                        return;
                    }                 
                });
            }
        });
    });
    
    //////////////////////////////////////
    // Notifying the coordinator of the results
    //////////////////////////////////////
    await db
        .ref(`/email/notifications`).push({
            template: 'importing-se-chunks',
            to: functions.config().coordinator.email_address,
            params: summary
    });
});