import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import uniqid from 'uniqid';

const lodash = require('lodash');
import * as moment from 'moment';
import * as helpers from './../helpers';


import { google } from "googleapis";
import GoogleSheets from '../services/GoogleSheets';
import { taskIdRegex } from "../helpers";

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

const basePath = "/sound-editing/";

const makeTaskId = (fileName: string, index: number) => {
  return `${fileName.match(taskIdRegex)[0]}-${index}`;
};

const validateTask = async (path: string) => {
  const response = await db.ref(path).once("value");
  return response.val();
};

export const createTaskFromChunks = functions.database.ref(
    "/sound-editing/chunks/{listId}/{fileName}/{index}"
).onCreate(async (snapshot, { params: { fileName, listId, index } }) => {
  const {
    continuationTo,
    continuationFrom,
    processingResolution = "",
    taskId: currentTaskId,
    beginning,
    ending
  } = snapshot.val();

  if (processingResolution.toLowerCase() !== "ok" || currentTaskId) return;
  const chunksPath = `${basePath}chunks/${listId}/`;
  const tasksPath = `${basePath}tasks/${listId}/`;
  const chunkDuration = ending - beginning;
  const chunkResponse = await db.ref(`${chunksPath}${fileName}`)
      .orderByKey()
      .limitToLast(1)
      .once("value");
  const chunks = chunkResponse.val() || [];
  let taskId;
  let duration;
  const allChunks = [snapshot.val()];

  // check for next chunk and create task id with current chunk and next chunk
  if (continuationTo) {
    const nextChunkResponse = await db
        .ref(`${chunksPath}${continuationTo}`)
        .once("value");
    const nextChunks = nextChunkResponse.val();
    if (nextChunks) {
      const nextChunk = nextChunks[0];
      allChunks.push(nextChunk);
      taskId = makeTaskId(fileName, chunks.length);
      if (await validateTask(`${tasksPath}${taskId}`)) {
        console.error("Task exists");
        return;
      }
      if (nextChunk.continuationFrom === fileName) {
        duration = ending - beginning + (nextChunk.ending - nextChunk.beginning);
        await db.ref(`${chunksPath}${fileName}/${index}`).update({ taskId });
        await db.ref(`${chunksPath}${continuationTo}/0`).update({ taskId });
      } else {
        return;
      }
    } else {
      return;
    }
  } else if (continuationFrom) { // check for previous chunk
    const previousChunkResponse = await db
        .ref(`${chunksPath}${continuationFrom}`)
        .orderByKey()
        .limitToLast(1).once("value");
    const previousChunks = previousChunkResponse.val();
    const previousChunk = previousChunks[previousChunks.length - 1];
    allChunks.unshift(previousChunk);
    taskId = makeTaskId(fileName, previousChunks.length + chunks.length - 1);
    if (await validateTask(`${tasksPath}${taskId}`)) {
      console.error("Task exists");
      return;
    }
    if (previousChunk.continuationTo === fileName) {
      duration = chunkDuration + (previousChunk.ending - previousChunk.beginning);
      await db.ref(`${chunksPath}${continuationFrom}/${previousChunks.length - 1}`).update({ taskId });
      await db.ref(`${chunksPath}${fileName}/${index}`).update({ taskId });
    } else {
      console.error("Invalid continuationTo from previous chunk");
      return;
    }
  } else { // single chunk without a continuation
    duration = chunkDuration;
    taskId = makeTaskId(fileName, chunks.length - 1);
    if (await validateTask(`${tasksPath}${taskId}`)) {
      console.error("Task exists");
      return;
    }
  }
  await db.ref(`${tasksPath}${taskId}`).set({
    chunks: allChunks,
    duration
  });
  return snapshot.val();
});



const validateSpreadsheetRow = (row, summary, sheetTitle) => {
  let resolutions = ['ok', 'drop', 'duplicate', 'on hold', 'reallot', 'repeat', 'derivative'];
  
  let _import = false;
  let rowValid = true;

  // [CHECK #1] File name belongs to the list identified by the sheet name			 
  if (helpers.extractListFromFilename(row['Audio File Name']) != sheetTitle) {
    console.warn("File name belongs to a different list.");//edited				
    summary.validityFailures.push({//edited
      row,
      issues: ['misplaced']
    });
    rowValid = false;
  }

  const resolution = row['Resolution'].toLowerCase();
  const fidCheckRes = row['Fidelity Check Resolution'].toLowerCase();

  // [CHECK #2] Both resolutions belong to the list of resolutions, case-insensitively.
  if (resolutions.indexOf(resolution) < 0 || resolutions.indexOf(fidCheckRes) < 0) {
    console.warn(`Audio file name: ${row['Audio File Name']} -- Error: Resolution, or Fidelity check resolution values isn't valid`);//edited
    if (rowValid)
      summary.validityFailures.push({
        row,
        issues: ['invalidResoultion']
      });
    else 
      summary.validityFailures[summary.validityFailures.length - 1].issues.push('invalidResoultion');
    rowValid = false;
  }

  // [CHECK #6] Beginning and Ending should be filled for rows with Resolution equal to `OK`.
  if (row['Beginning'] !== '' || row['Ending'] !== '' && resolution === 'ok') 
    _import = true;

      
  // `Beginning` value should be less than `Ending`.
  if (moment.duration(row['Beginning']).asSeconds() > moment.duration(row['Ending']).asSeconds()) {
    console.warn(`Audio file name: ${row['Audio File Name']} -- Error: "Beginning" value isn't less than "Ending".`);
    if (rowValid)
      summary.validityFailures.push({
        row,
        issues: ['BeginningGreaterThanEnding']
      });
    else 
      summary.validityFailures[summary.validityFailures.length - 1].issues.push('BeginningGreaterThanEnding');
  }
  return _import;
}


////////////////////////////////
//			validateFileChunks
//					1. Performing a validity check that can be performed
//						only after the chunks are grouped
//					2. Reporting chunks that are not the first chunk of a file and having `continuationfrom`
////////////////////////////////
const validateFileChunks = (chunks, fileName, summary) => {
  let chunksToImport = [];
  ////////////////////////////////////////////
  // [CHECK #5] Chunks of a single audio file 
  // should not overlap each other in timing.
  ////////////////////////////////////////////
  let lastEndingTime = null;
  chunks.forEach((chunk, i) => {								
    // `beginning` of the CURRENT chunk should be GREATER than the `ending` of the LAST chunk
    if (i !== 0 && chunk.beginning && lastEndingTime && chunk.beginning < lastEndingTime) {
      console.warn(`Audio file name: ${fileName} -- Error: Overlapping chunks.`);
      summary.validityFailures.push({
        audioFileName: fileName,
        row: chunk,
        issues: ['overlappingChunks']
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
      summary.validityFailures.push({
        row: chunk,
        issues: ['misplacedContinuationFrom']
      });
    
    
    // importing only chunks with `_import` flag set to true
    //	( the ones that passed all the validty checks )
    if (chunk._import) {
      delete chunk._import;
      chunksToImport.push(chunk);
    }
  });
  return chunksToImport;
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
  let sheetsInfo = await helpers.buildSheetIndex(sheets, spreadsheetId);
  
  const validSheetsTitles = [];
  sheetsInfo.forEach(sheet => {
    // Skip sheets not having (`Beginning` & `Ending`) columns //edited
    if (sheet.firstRow.indexOf('Beginning') >= 0 && sheet.firstRow.indexOf('Ending') >= 0)
      validSheetsTitles.push(sheet.title);
  });


  let currentFile, // used to increment the chunks of an audiofile coming from multiple rows into a single object
    summary = {
      validityFailures: [],
      addedChunks: 0
    };


  // `for` is used instead of `forEach` to get the updated value of `summary` 
  // after all the rows are read and validated
  // If `forEach` is used instead it requires its inner function to be `async` to allow for the 
  //	other logic to use the `await` keyword ..
  //	`forEach` doesn't wait in turn for its inner async functions to end, resulting the `summary`
  //	object to stay the same as it was before executing the `forEach`

  for(const sheetTitle of validSheetsTitles) {


    ////////////////////////////////////////////////////////////////////////////////////////////////
    // [TEMPORARY] this is added because of the limitation of 1000 rows, 26 columns per request
    ////////////////////////////////////////////////////////////////////////////////////////////////
    if (sheetTitle === 'ML2')
        continue;

    const gsheets = new GoogleSheets(
      spreadsheetId,
      sheetTitle
    );

    const rows = await gsheets.getRows();    
    
    // Maps each audio file name with its chunks
    //			EXAMPLE:
    //					chunks = {
    //							"BR-01A": [ chunk#1, chunk#2, .... ],
    //							"BR-03A": [ chunk#1, chunk#2, .... ],
    //					}
    let chunks = {};
    
    currentFile = { 
      file_name: null,
      chunks: []
    };

    ////////////////////////////////////////
    //	
    //	1. loop through all the rows in the current sheet
    //	2. Validate each row against the following checks:
    //			A. Misplaced files
    //			B. Non-existence of `Resolution` values in a row
    //			C. Empty values in either `Beginning` or `Ending` attributes
    //			D. `Beginning` being greater than `Ending`
    //	3. Build the `chunks` index object with the relative chunks
    //
    ////////////////////////////////////////
    for (const row of rows) {

      let _import;

      if (!row['Resolution'] || !row['Fidelity Check Resolution'])
        _import = false;
      else 
        _import = validateSpreadsheetRow(row, summary, sheetTitle);
          
      const audioFileName = row['Audio File Name'];
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
      if (currentFile.file_name === audioFileName) 
        currentFile.chunks.push(chunkToStore);
      
      // NEW FILE -->
      //			Flush the read chunks into the corresponding file in the `chunks` index
      //			& RESET the `currentFile` object
      else {
        if (currentFile.file_name != null) {
          // if file object exists, add the chunks to it
          if (chunks[currentFile.file_name]) 
            chunks[currentFile.file_name].push(currentFile.chunks)

          // if this is the first occurence of the file, set its value to the list of chunks 
          else		
            chunks[currentFile.file_name] = currentFile.chunks;
        }

        // Reset the `currentFile` object
        currentFile.file_name = audioFileName;
        currentFile.chunks = [chunkToStore];
      }										
    }
    

    

    const fileNames = Object.keys(chunks);
    for (let fileName of fileNames) {
      let currentFilechunks = chunks[fileName];

      // Sorting by `beginning` time
      currentFilechunks = await lodash.orderBy(currentFilechunks, ['beginning'], ['asc']);

      let chunksToImport = validateFileChunks(currentFilechunks, fileName, summary);

      summary.addedChunks += chunksToImport.length;

      //////////////////////////////////////
      // Ensuring data is NEVER overwritten
      //////////////////////////////////////
      const dbRef = `/sound-editing/chunks/${sheetTitle}/${fileName.split(' ')[0]}`;
      
      const ref = await db.ref(dbRef).once('value');

      if (!ref.exists())
        await db.ref(dbRef).set(chunksToImport);
      else {
        const dbChunks = ref.val();
        dbChunks.forEach((dbChunk, i) => {									 
          // Instead of comparing every single attribute,
          // the two chunk object are converted into strings and then compared
          if (JSON.stringify(dbChunk) != JSON.stringify(currentFilechunks[i])) {								
            console.warn(`Audio file name: ${fileName} -- Error: Modified data.`);
            summary.validityFailures.push({																				
              row: dbChunk,
              currentFilechunks,
              issues: ['modifiedData']
            });
            return;
          }								 
        });
      }
    }
  }	 

  
  //////////////////////////////////////
  // Notifying the coordinator of the results
  //////////////////////////////////////
  await db.ref(`/email/notifications`).push({
      template: 'importing-se-chunks',
      to: functions.config().coordinator.email_address,
      params: summary
  });		
});