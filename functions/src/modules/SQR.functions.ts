/*
 * sri sri guru gauranga jayatah
 */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as moment from 'moment';
import { URL } from 'url';
import { Spreadsheet } from '../classes/GoogleSheets';
import {
  commaSeparated,
  spreadsheetDateFormat,
  withDefault,
} from '../utils/parsers';
import * as helpers from './../helpers';

export enum ISoundQualityReportSheet {
  Allotments = 'Allotments',
  Submissions = 'Submissions',
}

/**
 * Saves allotment to the spreadsheet and sends an email notification
 */
export const processAllotment = functions.https.onCall(
  async ({ assignee, files, comment }, context) => {
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

    if (!assignee || !files || files.length === 0)
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Devotee and Files are required.'
      );

    const spreadsheet = await Spreadsheet.open(
      functions.config().sqr.spreadsheet_id
    );
    const sheet = await spreadsheet.useSheet(
      ISoundQualityReportSheet.Allotments
    );
    const fileNameColumn = await sheet.getColumn('File Name');
    const emailColumn = await sheet.getColumn('Email');

    /// Update files in the Allotments sheet, in parallel
    await Promise.all(
      files.map(async file => {
        const index = fileNameColumn.indexOf(file.filename);
        if (index < 0) {
          console.warn(
            `File ${file.filename} is not found in the SQR allotments.`
          );
          return;
        }
        const rowNumber = index + 1;
        const row = await sheet.getRow(rowNumber);
        row['Date Given'] = moment().format('MM/DD/YYYY');
        row['Status'] = 'Given';
        row['Devotee'] = assignee.name;
        row['Email'] = assignee.emailAddress;
        await sheet.updateRow(rowNumber, row);
      })
    );

    /// Send the allotment email
    const coordinator = functions.config().coordinator;

    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'sqr-allotment',
        to: assignee.emailAddress,
        bcc: coordinator.email_address,
        replyTo: coordinator.email_address,
        params: {
          files,
          assignee,
          comment,
          date: moment()
            .utcOffset(coordinator.utc_offset)
            .format('DD.MM'),
          repeated: emailColumn.indexOf(assignee.emailAddress) > 0,
        },
      });
  }
);

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

    admin
      .database()
      .ref(`/sqr/submissions/${original.serial}`)
      .update(submission);

    return 1;
  });

const acceptedStatuses: string[] = ['Given', 'WIP'];

const addSubmissionWarnings = async (
  currentSet,
  { soundQualityReporting: { status, assignee } },
  {
    cancellation: { notPreferredLanguage, audioProblem },
    fileName,
    changed,
    completed,
    author,
    comments,
  },
  isFirstSubmission
) => {
  const listId = fileName.split('-')[0];
  const warnings = [];
  if (isFirstSubmission)
    warnings.push('This is the first submission by this devotee!');
  if (notPreferredLanguage)
    warnings.push("The lecture is not in devotee's preferred language!");
  if (audioProblem)
    warnings.push(`Unable to play or download the audio ${comments}`);
  if (changed !== completed) warnings.push('This is an updated submission!');
  if (assignee.emailAddress !== author.emailAddress) {
    warnings.push(
      `File is alloted to another email id - ${assignee.emailAddress}`
    );
  }
  if (!acceptedStatuses.includes(status)) {
    warnings.push(`Status of file is ${status || 'Spare'}`);
  }
  const response = (await admin
    .database()
    .ref(`/original/${listId}/${fileName}`)
    .once('value')).val();
  if (!response)
    warnings.push(`Audio file name ${fileName} is not found in the backend!`);

  if (currentSet.filter(allotment => allotment.status === 'Given').length === 1)
    warnings.push("It's time to allot!");

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
    const fileSnapshot = await admin
      .database()
      .ref(`/original/${list}/${submission.fileName}`)
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

    admin
      .database()
      .ref(`/original/${list}/${submission.fileName}`)
      .update(fileUpdate);

    const coordinator = functions.config().coordinator;
    const fileData = fileSnapshot.val();

    /**
     * 3.2 Get the author's Allotments in ('given' || 'WIP') state
     * TO BE ADDED LATER
     * Currently passing an empty array
     */
    const allSubmissionsSnapshot = await admin
      .database()
      .ref(`/sqr/submissions`)
      .orderByChild('author/emailAddress')
      .equalTo(submission.author.emailAddress)
      .once('value');

    // 3.3 checking if the First Submission or not
    if (allSubmissionsSnapshot.exists()) {
      const allSubmissions = allSubmissionsSnapshot.val();

      const allotments = (await admin
        .database()
        .ref(`/original/${list}`)
        .orderByChild('soundQualityReporting/assignee/emailAddress')
        .equalTo(submission.author.emailAddress)
        .once('value')).val();

      const currentSet = Object.entries(allotments);
      currentSet.forEach((allotment: any, index, arr) => {
        const [
          {
            soundQualityReporting: { timestampGiven },
          },
        ] = allotment;
        allotment.timestampGiven = timestampGiven
          ? moment(timestampGiven).format('M/D/YYYY')
          : '';
        allotment.daysPassed = timestampGiven
          ? moment().diff(timestampGiven, 'days')
          : '';
      });

      const isFirstSubmission = Object.keys(allSubmissions).length <= 1;
      const warnings = await addSubmissionWarnings(
        currentSet,
        fileData,
        submission,
        isFirstSubmission
      );

      const allotmentUrl = new URL(
        '/sqr/allot',
        functions.config().website.base_url
      );
      allotmentUrl.search = `emailaddress=${submission.author.emailAddress}`;

      const updateUrl = new URL(
        '/form/sound-quality-report',
        functions.config().website.old.base_url
      );
      updateUrl.search = `token=${submission.token}`;

      // 3.4 Notify the coordinator
      // Sending the notification Email Finally
      admin
        .database()
        .ref(`/email/notifications`)
        .push({
          template: 'sqr-submission',
          to: coordinator.email_address,
          params: {
            currentSet,
            fileData,
            submission,
            isFirstSubmission,
            warnings,
            allotmentUrl,
            updateUrl,
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
    const submissionsSpreadsheet = await Spreadsheet.open(spreadsheetId);
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
      admin
        .database()
        .ref(
          `/submissions/soundQualityReporting/${list}/${audioFileName}/${token}`
        )
        .set(submission);
    }

    ////////////////////////
    //     Allotments
    ////////////////////////

    const allotmentsSpreadsheet = await Spreadsheet.open(spreadsheetId);
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
      admin
        .database()
        .ref(`/original/${list}/${fileName}/soundQualityReporting`)
        .update(allotment);
    }
  }
);

/**
 * On creation of a new allotment record id, update and sync data values to Google Spreadsheets
 *
 */
export const exportAllotmentsToSpreadsheet = functions.database
  .ref('/original/{listName}/{fileName}')
  .onUpdate(
    async (
      change: functions.Change<functions.database.DataSnapshot>,
      context: functions.EventContext
    ): Promise<any> => {
      const { fileName } = context.params;
      const changedValues = change.after.val();

      const spreadsheet = await Spreadsheet.open(
        functions.config().sqr.spreadsheet_id
      );
      const sheet = await spreadsheet.useSheet(
        ISoundQualityReportSheet.Allotments
      );
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
      const spreadsheet = await Spreadsheet.open(
        functions.config().sqr.spreadsheet_id
      );
      const submissionSheet = await spreadsheet.useSheet(
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

/**
 * Gets lists with spare files
 */
export const getLists = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token || !context.auth.token.coordinator) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'The function must be called by an authenticated coordinator.'
    );
  }

  const spreadsheet = await Spreadsheet.open(
    functions.config().sqr.spreadsheet_id
  );
  const allotmentsSheet = await spreadsheet.useSheet(
    ISoundQualityReportSheet.Allotments
  );

  const rows = await allotmentsSheet.getRows();

  return rows
    .filter(item => !item['Status'] && item['List'])
    .map(item => item['List'])
    .filter((value, index, self) => self.indexOf(value) === index);
});

/**
 * Gets spare files for specified list and languages
 */
export const getSpareFiles = functions.https.onCall(
  async ({ list, language, languages, count }, context) => {
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

    const spreadsheet = await Spreadsheet.open(
      functions.config().sqr.spreadsheet_id
    );
    const allotmentsSheet = await spreadsheet.useSheet(
      ISoundQualityReportSheet.Allotments
    );

    const allotmentsRows = await allotmentsSheet.getRows();

    return allotmentsRows
      .filter(
        item =>
          !item['Status'] &&
          item['List'] === list &&
          (languages || [language]).includes(item['Language'] || 'None')
      )
      .map(item => ({
        filename: item['File Name'],
        list: item['List'],
        serial: item['Serial'],
        notes:
          item['Notes'] + item['Devotee']
            ? ` Devotee column is not empty: ${item['Devotee']}`
            : '',
        language: item['Language'],
        date: item['Serial'],
      }))
      .slice(0, count || 20);
  }
);

export const cancelAllotment = functions.https.onCall(
    async (
        { fileName, comments, token, reason },
        {
          auth: {
            token: authToken
          } = { token: { coordinator: false } }
        } = {} as any
    ) => {
      const isCoordinator = authToken && authToken.coordinator;
      const listId = fileName.split("-")[0];
      const file = await admin.database().ref(
          `original/${listId}/${fileName}`
      ).orderByChild("token").equalTo(token).once("value");
      const originalFile = file.val();
      if (!originalFile) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid token")
      }
      const newComments = isCoordinator ?
          comments
          :
          `${originalFile.soundQualityReporting.notes}\n ${comments}`;
      return file.ref.update({
        "soundQualityReporting/status": reason === "unable to play" ? "Audio Problem" : "",
        "soundQualityReporting/timestampGiven": null,
        "soundQualityReporting/notes": newComments
      })
    }
);
