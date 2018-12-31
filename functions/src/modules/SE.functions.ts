import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { google } from "googleapis";
import uniqid from 'uniqid';
import * as helpers from './../helpers';
const lodash = require('lodash');
import * as moment from 'moment';


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

    let timestamp = new Date(allotment.timestamp);

    //  1. Ensure sound editor's `uploadCode`
    let userRef = await db
      .ref('/users')
      .orderByChild('emailAddress')
      .equalTo(allotment.assignee.emailAddress)
      .once('value');
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


export const importChunks = functions.runWith({
    timeoutSeconds: 300,
    memory: '1GB'
}).https.onRequest( async (req, res) => {
    const auth = await google.auth.getClient({
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = functions.config().reporting.content.processing.spreadsheet_id;
    let { sheetTitles, columnsIndex } = await helpers.buildSheetIndex(sheets, spreadsheetId);

    let resolutions = ['OK', 'Drop', 'Duplicate', 'On hold', 'Reallot', 'Repeat', 'Derivative'];
    let resolution, fidCheckRes; // variables to hold values of Res and fidRes when looping through the rows


    let lastFile, // used to increment the chunks of an audiofile coming from multiple rows into a single object
        summary = {
            addedChunks: 0, 
            emptyValues: 0, 
            misplaced: 0, 
            noResolution: 0, // rows with No `Resolution` or No `FidelityCheckResolution` values
            overlappingChunks: [], // Chunks with overlapping times
            modified: [] // Rows already found in the DB
        };

    
    for (let i = 0; i < sheetTitles.length; i++) { // Loop throughout the sheets of interest

        let rows = await helpers.getSheetRows(sheetTitles[i], sheets, spreadsheetId);
    
        lastFile = { 
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
        //
        ////////////////////////////////////////
        for (const row of rows) {
            let skip = false;


            // [CHECK #1] Misplaced audio file entry            
            if (helpers.extractListFromFilename(row[columnsIndex['AudioFileName']]) != sheetTitles[i].title) {
                summary.misplaced++;
                continue;
            }


            resolution = row[columnsIndex['Resolution']];
            fidCheckRes = row[columnsIndex['FidelityCheckResolution']];

            if (resolution && fidCheckRes) {
                // [CHECK #2] Non-existence of `Resolution` values in a row
                if (resolutions.indexOf(resolution) < 0 || resolutions.indexOf(fidCheckRes) < 0 || resolution != fidCheckRes) {
                    summary.noResolution++;
                    skip = true; // Didn't use `continue` here cause we want to skip ALL of the chunks
                                // not just this one
                }
            } else { // NULL was found in one of the attributes
                summary.noResolution++;
                skip = true;
            }


            if (row[columnsIndex['Beginning']] === '' || row[columnsIndex['Ending']] === '') {
                summary.emptyValues++;
                continue;
            }
            
            let AudioFileName = row[columnsIndex['AudioFileName']]         
            let continuationFrom = helpers.validateCellValue(row, columnsIndex, 'ContinuationFrom');
                
            let contentReporting = {
                date: helpers.validateCellValue(row, columnsIndex, 'Date'),
                locatioon: helpers.validateCellValue(row, columnsIndex, 'Location'),
                category: helpers.validateCellValue(row, columnsIndex, 'Category'),
                topics: helpers.validateCellValue(row, columnsIndex, 'Topics'),
                gurudevaTimings: helpers.validateCellValue(row, columnsIndex, 'GurudevaTimings'),
                otherSpeakers: helpers.validateCellValue(row, columnsIndex, 'OtherSpeakers'),
                kirtan: helpers.validateCellValue(row, columnsIndex, 'Kirtan'),
                abrutLecture: helpers.validateCellValue(row, columnsIndex, 'AbrutLecture'),
                suggestedTitle: helpers.validateCellValue(row, columnsIndex, 'SuggestedTitle'),
                languages: helpers.validateCellValue(row, columnsIndex, 'Languages'),
                soundQualityRating: helpers.validateCellValue(row, columnsIndex, 'SoundQuality'),
                soundIssues: helpers.validateCellValue(row, columnsIndex, 'SoundIssues'),
                comments: helpers.validateCellValue(row, columnsIndex, 'Comments'),
                submissionTimestamp: helpers.validateCellValue(row, columnsIndex, 'Timestamp'),
                submissionSerial: helpers.validateCellValue(row, columnsIndex, 'SubmissionSerial'),
            };


            if (lastFile.file_name === AudioFileName) {
                if (!skip)
                    lastFile.chunks.push({
                        audioFileName: AudioFileName,
                        beginning: moment.duration(row[columnsIndex['Beginning']]).asSeconds(),
                        ending: moment.duration(row[columnsIndex['Ending']]).asSeconds(),
                        continuationFrom,
                        contentReporting,
                        importTimestamp: admin.database.ServerValue.TIMESTAMP,
                        processingResolution: row[columnsIndex['Resolution']],
                    });
            } else { // NEW FILE -- Save the previous Chunks and CLEAR
                if (lastFile.file_name != null && !lastFile.skip) {
                    summary.addedChunks++;

                    //////////////////////////////////////////
                    //
                    // Ensuring chunks do NOT overlap in time
                    //
                    //////////////////////////////////////////
                    let lastEndingTime = null;
                    for (let k = 0; k < lastFile.chunks.length; k++) {
                        let chunk = lastFile.chunks[k];
                        
                        let beginning = moment(chunk.beginning, "HH:mm:ss");
                        let trackNameRegex = /\w+-\d+(.*)/;            
                        let track = trackNameRegex.exec(AudioFileName)[1];

                        // check if last chunck ending time is GREATER than current chunk ending time 
                        if (lastEndingTime && lastFile.track == track && lastEndingTime.diff(beginning)._data.seconds >= 0 ) {
                                summary.overlappingChunks.push(lastFile);
                                console.log('Overlapping chunks');
                        }
                        lastEndingTime = moment(chunk.ending, "HH:mm:ss");
                    }


                    let chunks = lastFile.chuncks;
                    
                    ///////////////////////////////
                    // Sorting by Beginning time
                    ///////////////////////////////
                    lastFile.chunks = lodash.orderBy(chunks, ['beginning'], ['asc']);

                    ////////////////////////////////////////////////////////
                    // Filling `continuationFrom` only for the FIRST chunk
                    ////////////////////////////////////////////////////////
                    for (let z = 0; z < chunks.length; z++) 
                        if (chunks[z].continuationFrom && z !== 0)
                            delete chunks[z].continuationFrom;



                    //////////////////////////////////////
                    // Ensuring data is NEVER overwritten
                    //////////////////////////////////////
                    let ref = await db
                        .ref(`/sound-editing/chunks/${sheetTitles[i].title}/${lastFile.file_name}`)
                        .once('value');

                    if (!ref.exists())
                        await db.ref(`/sound-editing/chunks/${sheetTitles[i].title}/${lastFile.file_name}`)
                            .set(lastFile.chunks);
                    else {
                        let data = ref.val();
                        for (let i = 0; i < data.length; i++) {
                            // Instead of comparing every single attribute, the two object are converted
                            // into strings and then compared
                            if (JSON.stringify(data[i]) != JSON.stringify(lastFile.chunks[i])) {
                                summary.modified.push(lastFile);
                                break;
                            }                        
                        }
                    }                
                }
                

                // 1. New chunk doesn't belong to the last audio file
                //          --> last audio file chunks were saved to firebase 
                //          --> Reset `lastFile` object to hold the last read row 
                //                         OR
                // 2. last chunk is `skipped` and therefor all of the previous chunks
                //      of the same audioFile ( the ones in the `lastFile` object ) is discarded
                //          --> Reset `lastFile` object to hold the last row


                lastFile.file_name = row[columnsIndex['AudioFileName']];
                lastFile.chunks = [{
                    audioFileName: row[columnsIndex['AudioFileName']],
                    beginning: moment.duration(row[columnsIndex['Beginning']]).asSeconds(),
                    ending: moment.duration(row[columnsIndex['Ending']]).asSeconds(),               
                    continuationFrom,
                    contentReporting,
                    importTimestamp: admin.database.ServerValue.TIMESTAMP,
                    processingResolution: row[columnsIndex['Resolution']],
                }];
                lastFile.skip = skip;
            }
        }
    }
    
    //////////////////////////////////////
    // Notifying the coordinator of the results
    //////////////////////////////////////
    await db
        .ref(`/email/notifications`).push({
            template: 'importing-se-chunks',
            to: functions.config().coordinator.email_address,
            params: summary
    });

    
    res.status(200).send(`Added chunks: ${summary.addedChunks}, Records with empty values: ${summary.emptyValues}, No resolution: ${summary.noResolution}`);
});