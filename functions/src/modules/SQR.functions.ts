import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as helpers from './../helpers';
const GoogleSpreadsheet = require('google-spreadsheet');
const moment = require('moment');

import { google } from 'googleapis';
import { promisify } from 'es6-promisify';

const db = admin.database();
import GoogleSheets from '../services/GoogleSheets';
import {
  spreadsheetDateFormat,
  withDefault,
  commaSeparated,
} from '../utils/parsers';

export enum ISoundQualityReportSheet {
  Allotments = 'Allotments',
  Submissions = 'Submissions',
}

/////////////////////////////////////////////////
//          OnNewAllotment (DB create and update Trigger)
//      1. Mark the files in the database --> { status: "Given" }
//              Function --> updateFilesOnNewAllotment
//
//      2. Send an email to the assignee to notify them of the new allotments
//              Function --> sendEmailOnNewAllotment
/////////////////////////////////////////////////
export const updateFilesOnNewAllotment = functions.database
  .ref('/sqr/allotments/{allotment_id}')
  .onCreate((snapshot, context) => {
    const allotment = snapshot.val();
    const newDocKey = snapshot.key;

    // loop through the FILES array in the NEW ALLOTMENT object
    // and update their corresponding file objects
    allotment.files.forEach(async file => {
      const sqrRef = db.ref(
        `/files/${allotment.list}/${file}/soundQualityReporting`
      );

      const sqrError = await sqrRef.update({
        status: 'Given',
        assignee: allotment.assignee,
        timestampGiven: Math.round(new Date().getTime() / 1000),
        timestampDone: null,
      });

      if (sqrError === undefined) {
        // if Successful FILE Update, update the ALLOTMENT accordingly

        // case 1 -- the allotmnet is read from the spreadsheet
        if (Object.keys(allotment).indexOf('sendNotificationEmail') > -1)
          db.ref(`/sqr/allotments/${newDocKey}`).update({
            filesAlloted: true,
          });
        // case 2 -- the allotmnet is inputted manually
        else
          db.ref(`/sqr/allotments/${newDocKey}`).update({
            filesAlloted: true,
            sendNotificationEmail: true,
          });
      }
    })
  }
)

/**
 * OnNewAllotment (DB create and update Trigger)
 * 1. Mark the files in the database --> { status: "Given" }
 * 2. Send an email to the assignee to notify them of the new allotments
 * 
 * @function processAllotment()
 */
export const processAllotment = functions.database
.ref('/sqr/allotments/{allotment_id}').onWrite(async (snapshot, context) => {
  const allotment = snapshot.after.val(); // new allotment
  const newDocKey = snapshot.after.key;
  const old = snapshot.before.val();
  const coordinatorConfig = functions.config().coordinator;

  // loop through the FILES array in the NEW ALLOTMENT object
  // and update their corresponding file objects
  allotment.files.forEach(async file => {
    // Skip the current iteration if allotment.list doesn't exist
    if (!allotment.list) return;

    const sqrRef = db.ref(`/files/${allotment.list}/${file}/soundQualityReporting`);
    const sqrError = await sqrRef.update({
      status: 'Given',
      assignee: allotment.assignee,
      timestampGiven: moment().format('x'), // gives timestamp in ms
      timestampDone: null,
    });

    // if Successful FILE Update, update the ALLOTMENT accordingly
    if (sqrError === undefined) {
      // case 1 -- the allotmnet is read from the spreadsheet
      if (Object.keys(allotment).indexOf('sendNotificationEmail') > -1) {
        db.ref(`/sqr/allotments/${newDocKey}`).update({
          filesAlloted: true,
        });
      }
      // case 2 -- the allotmnet is inputted manually 
      else { 
        db.ref(`/sqr/allotments/${newDocKey}`).update({
          filesAlloted: true,
          sendNotificationEmail: true,
        });
      }
    }
  });

  
  // Sends a notification to the assignee of the files he's allotted.
  const allotmentSnapshot = await db
    .ref('/sqr/allotments')
    .orderByChild('assignee/emailAddress')
    .equalTo(allotment.assignee.emailAddress)
    .once('value');

  const allotments = allotmentSnapshot.val();
  
  /**
   * 1. sending mail ( only if sendNotificationEmail is TRUE 
   * 2. old allotment's filesAlloted is False
   * 3. allotment has valid assignee )
   * sendNotificationEmail is FASLE if the record is read from the spreadsheet
   */
  if (
    !old.filesAlloted &&
    allotment.filesAlloted &&
    allotment.assignee &&
    allotment.sendNotificationEmail
  ) {
    if (allotment.assignee.emailAddress) {
      const utcMsec = moment().zone('utc').format('x'); // returns ms in utc

      const localDate = new Date(
        utcMsec + 3600000 * coordinatorConfig.timeZoneOffset
      );

      db.ref(`/email/notifications`).push({
        template: "sqr-allotment",
        to: allotment.assignee.emailAddress,
        bcc: [{ email: coordinatorConfig.email_address }],
        params: {
          files: allotment.files,
          assignee: allotment.assignee,
          comment: allotment.comment,
          date: `${localDate.getDate() + 1}.${moment().month() + 1}`,
          repeated: Object.keys(allotments).length > 1,
        },
      });

      snapshot.after.ref
        .child('mailSent')
        .set(true)
        .catch(err => console.log(err));
    }
  }

  return 1;
});


/**
 * Restructure External Submission
 * 1. Restructuring the submission and inserting it into /sqr/submissions path
 * 
 * @function restructureExternalSubmission()
 */
export const restructureExternalSubmission = functions.database
.ref('/webforms/sqr/{submission_id}')
.onCreate(async (snapshot, context) => {
  const original = snapshot.val();

  // 1. Add the webform data to a SQR submissions DB path
  const submission = {
    fileName: original.audio_file_name,
    cancellation: {
      notPreferredLanguage: original.not_preferred_language,
      audioProblem: original.unable_to_play_or_download,
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
    author: {
      name: original.name,
      emailAddress: original.email_address,
    },
  };

  db.ref(`/sqr/submissions/${original.serial}`).update(submission);

  return 1;
});


/**
 * SQR Process Submission
 * 1. Notifying the coordinator using a mail that holds the following information
 * 2. Update the allotment to reflect the current state of the audio file
 * 3. Setting the audio file status
 * 
 * Function -> processSubmission()
 */
export const processSubmission = functions.database
.ref('/sqr/submissions/{submission_id}')
.onCreate(async (snapshot, context) => {
  const submission = snapshot.val();

  let audioFileStatus = 'WIP';
  if (submission.cancellation.notPreferredLanguage) 
    audioFileStatus = 'spare';	 
  else if (submission.cancellation.audioProblem)	
    audioFileStatus = 'audioProblem';

    //  EXTRACTING the list name first from the file_name
  const list = helpers.extractListFromFilename(submission.fileName);
  

  // 2. Update the allotment ( first get the previous NOTES )
  // 3.1 Get the submitted audio file data
  const fileSnapshot = await db
    .ref(`/files/${list}/${submission.fileName}`)
    .once('value');
    
  
  // If fileSnapshot doesn't exist stop the execution
  if (!fileSnapshot.exists()) return false;

  const fileUpdate = { status: audioFileStatus };

  // in case 1 & 2 add the comments to the notes
  if (audioFileStatus !== 'WIP') {
    fileUpdate['notes'] = `${fileSnapshot.val().notes}\n${
      submission.comments
    }`;
  }

  // if the audio has any cancellation then REMOVE the assignee from the file allotment
  if (submission.cancellation.audioProblem || submission.cancellation.notPreferredLanguage) 
    fileUpdate['assignee'] = {};

  db.ref(`/files/${list}/${submission.fileName}`).update(
    fileUpdate
  );

  const coordinator = functions.config().coordinator;
  const fileData = fileSnapshot.val();

  /**
   * 3.2 Get the author's Allotments in ('given' || 'WIP') state
   * TO BE ADDED LATER
   * Currently passing an empty array
   */
  const allSubmissionsSnapshot = await db
    .ref(`/sqr/submissions`)
    .orderByChild('author/emailAddress')
    .equalTo(submission.author.emailAddress)
    .once('value');

  // 3.3 checking if the First Submission or not
  if (allSubmissionsSnapshot.exists()) {
    const allSubmissions = allSubmissionsSnapshot.val();

    // 3.4 Notify the coordinator
    // Sending the notification Email Finally
    db.ref(`/email/notifications`).push({
      template: "sqr-submission",
      to: coordinator.email_address,
      params: {
        submission,
        fileData,
        currentSet: [],
        isFirstSubmission: Object.keys(allSubmissions).length <= 1,
      },
    });
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
export const importSpreadSheetData = functions.https.onRequest(
  async (req, res) => {
    const auth = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const spreadsheetId = functions.config().sqr.spreadsheetId;
    const spreadsheet = new GoogleSpreadsheet(spreadsheetId);

    const token = await auth.getAccessToken();
    spreadsheet.setAuthToken(token);

    const getInfo = promisify(spreadsheet.getInfo);
    const data = await getInfo();

    let AllotmentsSheet, SubmissionsSheet;

    data.worksheets.forEach(worksheet => {
      if (worksheet.title === 'Submissions') SubmissionsSheet = worksheet;
      if (worksheet.title === 'Allotments') AllotmentsSheet = worksheet;
    });

    const getSubmissions = promisify(SubmissionsSheet.getRows);

    // submissions = Submissions sheet rows
    const submissions = await getSubmissions();
    submissions.forEach(row => {
      const serial = row['submissionserial'];

      const regex = /(.*?)–(.*):(.*)—(.*)/g;
      const soundissuesMatch = regex.exec(row['soundissues']);
      const unwantedpartsMatch = regex.exec(row['unwantedparts']);

      const soundissues = {
          beginning: soundissuesMatch[1],
          ending: soundissuesMatch[2],
          type: soundissuesMatch[3],
          description: soundissuesMatch[4],
        },
        unwantedparts = {
          beginning: unwantedpartsMatch[1],
          ending: unwantedpartsMatch[2],
          type: unwantedpartsMatch[3],
          description: unwantedpartsMatch[4],
        };

      const submission = {
        author: {
          name: row['name'],
          emailAddress: row['emailAddress'],
        },
        fileName: row['audiofilename'],
        changed: row['changed'],
        completed: row['completed'],
        created: row['created'],
        comments: row['comments'],
        soundissues,
        soundqualityrating: row['soundqualityrating'],
        unwantedparts,
        duration: {
          beginning: new Date(row['beginning']).getTime() / 1000,
          ending: new Date(row['ending']).getTime() / 1000,
        },
      };

      db.ref(`/sqr/submissions/${serial}`).set(submission);
    });

    const getAllotments = promisify(AllotmentsSheet.getRows);
    // alllotments = Allotments sheet rows
    const allotments = await getAllotments();

    // Group all the files allotted on one day under a single `Allotment Node` in the db
    // Group by ASSIGNEEs/DATEs/LISTs

    const groupedAllotments = helpers.groupByMulti(
      allotments,
      ['devotee', 'dategiven', 'list'],
      {}
    );

    // Adding the allotments
    for (const assignee in groupedAllotments) {
      for (const date in groupedAllotments[assignee]) {
        const dayFiles = [];
        for (const list in groupedAllotments[assignee][date]) {
          // Collecting all of the files on a list under a single day in an array
          groupedAllotments[assignee][date][list].forEach(item => {
            dayFiles.push(item['filename']);
          });

          const allotment = {
            assignee: {
              name: assignee,
              emailAddress: groupedAllotments[assignee][date][list][0]['email'],
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

    res
      .status(200)
      .send(
        `Function was called successfully, check the Logs on Firebase to find out if something went wrong`
      );
  }
);

/**
 * On creation of a new allotment record id, update and sync data values to Google Spreadsheets
 *
 */
export const exportAllotmentsToSpreadsheet = functions.database
  .ref('/files/{listName}/{fileName}')
  .onUpdate(
    async (
      change: functions.Change<functions.database.DataSnapshot>,
      context: functions.EventContext
    ): Promise<any> => {
      const { fileName } = context.params;
      const changedValues = change.after.val();

      const gsheets = new GoogleSheets(
        functions.config().sqr.spreadsheet_id,
        ISoundQualityReportSheet.Allotments
      );
      const allotmentFileNames = await gsheets.getColumn('File Name');
      const rowNumber = allotmentFileNames.indexOf(fileName) + 1;
      const { languages, notes, soundQualityReporting } = changedValues;

      const {
        timestampGiven,
        assignee,
        timestampDone,
        followUp,
      } = soundQualityReporting;

      const row: any = await gsheets.getRow(rowNumber);
      row['Date Given'] = spreadsheetDateFormat(timestampGiven);
      row['Notes'] = withDefault(notes);
      row['Language'] = commaSeparated(languages);
      row['Status'] = soundQualityReporting.status;
      row['Devotee'] = withDefault(assignee.name);
      row['Email'] = withDefault(assignee.emailAddress);
      row['Date Done'] = spreadsheetDateFormat(timestampDone);
      row['Follow Up'] = withDefault(followUp);
      await gsheets.updateRow(rowNumber, row);
    }
  );

interface IAudioChunkDescription {
  beginning: string; // h:mm:ss
  ending: string; // h:mm:ss
  type: string;
  description: string;
}

/**
 * Used for Unwanted Parts and Sound Issues to create multi-line comments
 *
 */
export function formatMultilineComment(
  audioDescriptionList: IAudioChunkDescription[]
) {
  if (!audioDescriptionList || !audioDescriptionList.length) {
    return '';
  }
  let multiline = '';
  audioDescriptionList.forEach(
    (elem: IAudioChunkDescription, index: number) => {
      multiline =
        multiline +
        `${elem.beginning}-${elem.ending}:${elem.type} -- ${elem.description}` +
        (audioDescriptionList.length === index + 1 ? '' : '\n');
    }
  );
  return multiline;
}

export function createUpdateLink(token: string): string {
  return `http://purebhakti.info/audioseva/form/sound-quality-report?token=${token}`;
}

/**
 * On creation of a new submission record id, update and sync data values to Google Spreadsheets
 *
 */
export const exportSubmissionsToSpreadsheet = functions.database
  .ref('/sqr/submissions/{submission_id}')
  .onCreate(
    async (
      snapshot: functions.database.DataSnapshot,
      context: functions.EventContext
    ): Promise<any> => {
      const gsheets = new GoogleSheets(
        functions.config().sqr.spreadsheet_id,
        ISoundQualityReportSheet.Submissions
      );
      const {
        author,
        changed,
        comments,
        completed,
        duration,
        fileName,
        soundIssues,
        soundQualityRating,
        token,
        unwantedParts,
      } = snapshot.val();
      
      await gsheets.appendRow({
        Completed: spreadsheetDateFormat(completed),
        Updated: spreadsheetDateFormat(changed),
        'Submission Serial': context.params.submission_id,
        'Update Link': createUpdateLink(token),
        'Audio File Name': withDefault(fileName),
        'Unwanted Parts': formatMultilineComment(unwantedParts),
        'Sound Issues': formatMultilineComment(soundIssues),
        'Sound Quality Rating': withDefault(soundQualityRating),
        Beginning: withDefault(duration.beginning),
        Ending: withDefault(duration.ending),
        Comments: withDefault(comments),
        Name: withDefault(author.name),
        'Email Address': withDefault(author.emailAddress),
      });
    }
  )
