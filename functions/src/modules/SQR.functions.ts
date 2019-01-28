import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as helpers from './../helpers';
const moment = require('moment');

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
    });
  });

/**
 * OnNewAllotment (DB create and update Trigger)
 * 1. Mark the files in the database --> { status: "Given" }
 * 2. Send an email to the assignee to notify them of the new allotments
 *
 * @function processAllotment()
 */
export const processAllotment = functions.database
  .ref('/sqr/allotments/{allotment_id}')
  .onWrite(async (snapshot, context) => {
  const allotment = snapshot.after.val(); // new allotment
  const newDocKey = snapshot.after.key;
  const old = snapshot.before.val();
  const coordinatorConfig = functions.config().coordinator;

  // loop through the FILES array in the NEW ALLOTMENT object
  // and update their corresponding file objects
  allotment.files.forEach(async file => {
    // Skip the current iteration if allotment.list doesn't exist
    if (!allotment.list) return;

      const sqrRef = db.ref(
        `/files/${allotment.list}/${file}/soundQualityReporting`
      );
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
        const utcMsec = moment()
          .zone('utc')
          .format('x'); // returns ms in utc

      const localDate = new Date(
        utcMsec + 3600000 * coordinatorConfig.timeZoneOffset
      );

      db.ref(`/email/notifications`).push({
          template: 'sqr-allotment',
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

const acceptedStatuses: string[] = ["Given", "WIP"];

const addSubmissionWarnings = async (
    currentSet,
    { soundQualityReporting: { status, assignee } },
    { cancellation: { notPreferredLanguage, audioProblem }, fileName, changed, completed, author, comments },
    isFirstSubmission
) => {
  const listId = fileName.split("-")[0];
  const warnings = [];
  if (isFirstSubmission) warnings.push("This is the first submission by this devotee!");
  if (notPreferredLanguage) warnings.push("The lecture is not in devotee's preferred language!");
  if (audioProblem) warnings.push(`Unable to play or download the audio ${comments}`);
  if (changed !== completed) warnings.push("This is an updated submission!");
  if (assignee.emailAddress !== author.emailAddress) {
    warnings.push(`File is alloted to another email id - ${assignee.emailAddress}`)
  }
  if (!(acceptedStatuses.includes(status))) {
    warnings.push(`Status of file is ${status || "Spare"}`)
  }
  const response = (await db.ref(`/files/${listId}/${fileName}`).once("value")).val();
  if (!response) warnings.push(`Audio file name ${fileName} is not found in the backend!`);
  let shouldShowStatusWarning = true;
  if (status === "Given") {
    for (const allotment of currentSet) {
      if (allotment.status === "Given") {
        shouldShowStatusWarning = false;
        break;
      }
    }
    if (shouldShowStatusWarning) warnings.push("It's time to allot!");
  }
  return warnings;
};

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
    if (submission.cancellation.notPreferredLanguage) audioFileStatus = 'spare';
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
    if (
      submission.cancellation.audioProblem ||
      submission.cancellation.notPreferredLanguage
    )
    fileUpdate['assignee'] = {};

    db.ref(`/files/${list}/${submission.fileName}`).update(fileUpdate);

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

    const allotments = (await db
        .ref(`/files/${list}`)
        .orderByChild("soundQualityReporting/assignee/emailAddress")
        .equalTo(submission.author.emailAddress).once("value")
    ).val();

    const currentSet = [];

    Object.entries(allotments).forEach(
        ([fileName, { languages, soundQualityReporting: { timestampGiven, status } }]: any) => {
          currentSet.push({
            fileName,
            status,
            timestampGiven: timestampGiven ? moment(timestampGiven).format("M/D/YYYY") : "",
            daysPassed: timestampGiven ? moment().diff(timestampGiven, "days") : "Not available",
            languages
          });
        });

    const isFirstSubmission = Object.keys(allSubmissions).length <= 1;
    const warnings = await addSubmissionWarnings(currentSet, fileData, submission, isFirstSubmission);

    // 3.4 Notify the coordinator
    // Sending the notification Email Finally
    db.ref(`/email/notifications`).push({
        template: 'sqr-submission',
      to: coordinator.email_address,
      params: {
        currentSet,
        fileData,
        submission,
        isFirstSubmission,
        warnings
      },
    });
  }

  return 1;
  });

/**
 * Parse "Sound Issue" or "Unwanted parts" string to extract its different parts
 *
 * @param string "Sound Issue" or "Unwanted parts" string to parse
 */
const parseAudioChunkRemark = string => {
  /**
   * Regex to parse the value "Sound Issues" & "Unwanted Parts"
   * 'g' flag is used to match one or more occurences of the pattern
   */
  const regex = /((Entire file)|(.*?)–(.*)):(.*)—(.*)/g;
  const tokens = [];
  let matches = regex.exec(string);
  while (matches) {
    tokens.push({
      entireFile: matches[2] ? true : null,
      beginning: matches[2] ? null : matches[3],
      ending: matches[2] ? null : matches[4],
      type: matches[5].trim(),
      description: matches[6].trim(),
    });
    matches = regex.exec(string);
  }

  return tokens;
};
/////////////////////////////////////////////////
//          Import Submission and Allotments from a Spreadsheet(Http Triggered)
//
//      1. Parses a google spreadsheet
//      2. Looks for two sheets --> Allotments & Submissions
//      3. Loads their data into the equivalent Firebase database paths
/////////////////////////////////////////////////
export const importSpreadSheetData = functions.https.onCall(
  async (data, context) => {
    if (
      !context.auth ||
      !context.auth.token ||
      !context.auth.token.coordinator
    ) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'The function must be called by an authenticated coordinator.'
      );
    }

    const spreadsheetId = functions.config().sqr.spreadsheet_id;

    ////////////////////////
    //     Submissions
    ////////////////////////
    const submissionsSpreadsheet = new GoogleSheets(spreadsheetId);
    const submissionsSheet = await submissionsSpreadsheet.useSheet(
      ISoundQualityReportSheet.Submissions
    );
    const submissionsRows = await submissionsSheet.getRows();
    for (const row of submissionsRows) {
      const audioFileName = row['Audio File Name'];
      const list = helpers.extractListFromFilename(audioFileName);

      const token = /.*token=([\w-]+)/.exec(row['Update Link'])[1];

      const soundIssues = parseAudioChunkRemark(row['Sound Issues']);
      const unwantedParts = parseAudioChunkRemark(row['Unwanted Parts']);

      const submission = {
        completed: row['Completed'] || null,
        created: row['Completed'] || null,
        comments: row['Comments'],
        soundIssues,
        soundQualityRating: row['Sound Quality Rating'],
        unwantedParts,
        duration: {
          beginning: row['Beginning'],
          ending: row['Ending'],
        },
      };
      db.ref(
        `/submissions/soundQualityReporting/${list}/${audioFileName}/${token}`
      ).set(submission);
    }

    ////////////////////////
    //     Allotments
    ////////////////////////

    const allotmentsSpreadsheet = new GoogleSheets(spreadsheetId);
    const allotmentsSheet = await allotmentsSpreadsheet.useSheet(
      ISoundQualityReportSheet.Allotments
    );
    const allotmentsRows = await allotmentsSheet.getRows();

    for (const row of allotmentsRows) {
      if (!row) continue;

      const fileName = row['File Name'];

      const fileNameHasForbiddenChars = fileName.match(/[\.\[\]$#]/g);
      if (fileNameHasForbiddenChars) {
        console.warn(
          `File "${fileName}" has forbidden characters that can't be used as a node name.`
    );
        continue;
      }

      const list = helpers.extractListFromFilename(fileName);
          const allotment = {
        status: row['Status'] || null,
        timestampGiven: row['Date Given']
          ? new Date(row['Date Given']).getTime() / 1000
          : null,
        timestampDone: row['Date Done']
          ? new Date(row['Date Done']).getTime() / 1000
          : null,
            assignee: {
          emailAddress: row['Email'] || null,
          name: row['Devotee'] || null,
            },
        followUp: row['Follow-up'] || null,
          };
      db.ref(`/files/${list}/${fileName}/soundQualityReporting`).update(
        allotment
      );
        }
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

      const gsheets = new GoogleSheets(functions.config().sqr.spreadsheet_id);
      const sheet = await gsheets.useSheet(ISoundQualityReportSheet.Allotments);
      const allotmentFileNames = await sheet.getColumn('File Name');
      const rowNumber = allotmentFileNames.indexOf(fileName) + 1;
      const { languages, notes, soundQualityReporting } = changedValues;

      const {
        timestampGiven,
        assignee,
        timestampDone,
        followUp,
      } = soundQualityReporting;

      const row: any = await sheet.getRow(rowNumber);
      row['Date Given'] = spreadsheetDateFormat(timestampGiven);
      row['Notes'] = withDefault(notes);
      row['Language'] = commaSeparated(languages);
      row['Status'] = soundQualityReporting.status;
      row['Devotee'] = withDefault(assignee.name);
      row['Email'] = withDefault(assignee.emailAddress);
      row['Date Done'] = spreadsheetDateFormat(timestampDone);
      row['Follow Up'] = withDefault(followUp);
      await sheet.updateRow(rowNumber, row);
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
      const gsheets = new GoogleSheets(functions.config().sqr.spreadsheet_id);
      const submissionSheet = await gsheets.useSheet(
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

      await submissionSheet.appendRow({
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
  );
