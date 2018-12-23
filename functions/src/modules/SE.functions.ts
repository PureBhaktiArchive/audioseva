import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google } from "googleapis";
const lodash = require('lodash');
import uniqid from 'uniqid';

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


const timeToMins = (time) => {
    let hours = time.split(':')[0];
    let mins = time.split(':')[1];
    return (+hours * 60) + (+mins);
}

export const importSpreadSheetData = functions.runWith({
  timeoutSeconds: 300,
  memory: '1GB'
}).https.onRequest( async (req, res) => {
  const auth = await google.auth.getClient({
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });

  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheetId = functions.config().sound_editing.spreadsheet_id;

  const currentSheets = await sheets.spreadsheets.get({
      spreadsheetId
  });

  ////////////////////////
  // Building an index
  ////////////////////////

  const sheetTitles = [];
  let columnsIndex = {}; // { ColumnName: column_index }

  for (let i = 0; i < currentSheets.data.sheets.length; i++) {
      let { title } = currentSheets.data.sheets[i].properties;
      const result = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${title}!1:1` // all the cells in the first row `Column headers`
      });

      if (!result.data.values || result.data.values.length === 0) {
          console.log(`No data found in sheet: ${title}`);
          continue;
      }
  
      // Filtering the sheets
      const row = result.data.values[0] 
      if (row.indexOf('Beginning') > -1 && row.indexOf('Ending') > -1) {
          sheetTitles.push(title);
          row.forEach((col, i) => {
              columnsIndex[col.replace(/ /g, '')] = i;
          });
      }
  }


  let resolutions = ['ok', 'drop', 'duplicate', 'on_hold', 'reallot', 'repeat', 'derivative'];
  let resolution, fidCheckRes;
  let lastFile,
      summary = { 
          addedChunks: 0, 
          emptyValues: 0, 
          misplaced: 0, 
          noResolution: 0, 
          overlappingChunks: [],
          modified: []
      };

  for (let i = 0; i < sheetTitles.length; i++) {
      const result = await sheets
          .spreadsheets.values.get({
              spreadsheetId,
              range: `${sheetTitles[i]}!A2:AZ1000`
          });
  
      const rows = result.data.values;        

      lastFile = { 
          file_name: null,
          chunks: [], 
          skip: false, 
          track: null 
      };

      for (const row of rows) {
          let skip = false;

          // Misplaced audiofile entry
          if (row[columnsIndex['AudioFileName']].split('-')[0] != sheetTitles[i]) {
              summary.misplaced++;
              continue;
          }


          resolution = row[columnsIndex['Resolution']];
          fidCheckRes = row[columnsIndex['FidelityCheckResolution']];

          if (resolution && fidCheckRes) {
          
              resolution = resolution.toLowerCase().replace(' ', '_');
              fidCheckRes = fidCheckRes.toLowerCase().replace(' ', '_');

              if (resolutions.indexOf(resolution) < 0 || resolutions.indexOf(fidCheckRes) < 0) {
                  summary.noResolution++;
                  skip = true;
                  // Didn't use `continue` here cause we want to skip all of the chunks
                  // not just this one
              }
          } else {
              summary.noResolution++;
              skip = true;
          }


          if (row[columnsIndex['Beginning']] === '' || row[columnsIndex['Ending']] === '') {
              summary.emptyValues++;
              continue;
          }

          let AudioFileName = row[columnsIndex['AudioFileName']]


          let trackNameRegex = /\w+-\d+(.*)/;            
          let track = trackNameRegex.exec(AudioFileName)[1];


          if (lastFile.file_name === AudioFileName) {
              if (!skip)
                  lastFile.chunks.push({
                      audioFileName: AudioFileName,
                      beginning: row[columnsIndex['Beginning']],
                      ending: row[columnsIndex['Ending']],
                      continuationFrom: row[columnsIndex['ContinuationFrom']]
                  });
          } else { // NEW FILE -- Save the previous Chunks and CLEAR
              if (lastFile.file_name != null && !lastFile.skip) {
                  summary.addedChunks++;


                  let lastEndingTime = -1;
                  for (let k = 0; k < lastFile.chunks.length; k++) {
                      let chunk = lastFile.chunks[k];
                      if (!chunk.continuationFrom)
                          continue;
                      //////////////////////////////////
                      // Ensuring chunks do NOT overlap
                      //////////////////////////////////
                      if (timeToMins(chunk.beginning) < lastEndingTime && 
                          timeToMins(chunk.beginning) != 0 && lastFile.track == track) {
                              summary.overlappingChunks.push(lastFile);
                              console.log('Overlapping chunks');
                      }
                  }


                  ///////////////////////////////
                  // Sorting by Beginning time
                  ///////////////////////////////
                  let chunks = lastFile.chunks;

                  // `start` attribute is added to be used in sorting
                  chunks.forEach(element => element.start = timeToMins(element.beginning));
                  chunks = lodash.orderBy(chunks, ['start'], ['asc']);

                  // getting rid of the added `start` attribute
                  chunks.forEach(element => delete element.start);



                  ////////////////////////////////////////////////////////
                  // Filling `continuationFrom` only for the FIRST column
                  ////////////////////////////////////////////////////////
                  let continuationFrom = null;
                  chunks.forEach(chunk => {
                      if (!chunk.continuationFrom)
                          return;
                      
                      continuationFrom = chunk.continuationFrom;
                      delete chunk.continuationFrom;
                  });

                  if (continuationFrom)
                      chunks[0].continuationFrom = continuationFrom;



                  //////////////////////////////////////
                  // Ensuring data is NEVER overwritten
                  //////////////////////////////////////
                  let ref = await db
                      .ref(`/sound-editing/chunks/${sheetTitles[i]}/${lastFile.file_name}`)
                      .once('value');

                  if (!ref.exists())
                      await db
                          .ref(`/sound-editing/chunks/${sheetTitles[i]}/${lastFile.file_name}`)
                          .update(lastFile.chunks);
                  else 
                      summary.modified.push(lastFile);   
              }
              
              lastFile.file_name = row[columnsIndex['AudioFileName']];
              lastFile.chunks = [{
                  audioFileName: row[columnsIndex['AudioFileName']],
                  beginning: row[columnsIndex['Beginning']],
                  ending: row[columnsIndex['Ending']],
              }];
              lastFile.skip = skip;
          }
      }
  }

  //////////////////////////////////////
  // Notifying the admin of the results
  //////////////////////////////////////
  await db.ref(`/email/notifications`).push({
      template: 'importing-se-chunks',
      to: functions.config().coordinator.email_address,
      bcc: [{ email: functions.config().coordinator.email_address }],
      params: {
          summary
      }
  });

  res.status(200).send(`Added chunks: ${summary.addedChunks}, Records with empty values: ${summary.emptyValues}, No resolution: ${summary.noResolution}`);
});