/*
 * sri sri guru gauranga jayatah
 */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as moment from 'moment';
import { URL } from 'url';
import { Spreadsheet } from '../classes/GoogleSheets';
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
 * SQR Submission processing
 * Updating the allotment and sending notification email.
 */
export const processSubmission = functions.database
  .ref('/submissions/soundQualityReporting/{list}/{fileName}/{token}')
  .onUpdate(async (change, { params: { list, fileName, token } }) => {
    // Ignore deletions
    if (!change.after.exists())
      return;

    const submission = change.after.val();

    // Ignore draft submissions
    if (!submission.completed)
      return;

    // Ignore imported submissions
    if (!change.before.exists() && submission.imported)
      return;

    const fileSnapshot = await admin
      .database()
      .ref(`/original/${list}/${fileName}`).once('value');

    if (!fileSnapshot.exists())
      throw new Error(`File ${fileName} is not found in the database.`);

    await fileSnapshot.ref.update({
      soundQualityReporting: {
        status: 'WIP'
      }
    });

    const currentAllotment = fileSnapshot.val().soundQualityReporting;

    // * Update the spreadsheet

    const spreadsheet = await Spreadsheet.open(functions.config().sqr.spreadsheet_id);
    const sheet = await spreadsheet.useSheet(ISoundQualityReportSheet.Submissions);

    const row = {
      'Completed': moment(submission.completed * 1000).format('MM/DD/YYYY'),
      'Updated': moment(submission.changed * 1000).format('MM/DD/YYYY'),
      'Update Link': getSubmissionUpdateLink(fileName, token),
      'Audio File Name': fileName,
      'Unwanted Parts': formatMultilineComment(submission.unwantedParts),
      'Sound Issues': formatMultilineComment(submission.soundIssues),
      'Sound Quality Rating': submission.soundQualityRating,
      'Beginning': submission.duration.beginning,
      'Ending': submission.duration.ending,
      'Comments': submission.comments,
      'Name': currentAllotment.assignee.name,
      'Email Address': currentAllotment.assignee.emailAddress,
    };

    if (change.before.exists())
      await sheet.updateOrAppendRow('Audio File Name', fileName, row);
    else
      await sheet.appendRow(row);

    // * Send email notification for the coordinator

    const coordinator = functions.config().coordinator;

    const currentSet = [];
    (await admin
      .database()
      .ref(`/original/${list}`)
      .orderByChild('soundQualityReporting/assignee/emailAddress')
      .equalTo(submission.author.emailAddress)
      .once('value')).forEach(child => {
        const value = child.val();
        currentSet.push({
          fileName: child.key,
          dateGiven: moment(value.soundQualityReporting.timestampGiven).format('M/D/YYYY'),
          status: value.soundQualityReporting.status,
          daysPassed: moment().diff(value.soundQualityReporting.timestampGiven, 'days'),
          languages: value.languages,
        });
      });

    const warnings = [];
    if (submission.changed !== submission.completed)
      warnings.push('This is an updated submission!');

    if (currentAllotment.assignee.emailAddress !== submission.author.emailAddress)
      warnings.push(
        `File is alloted to another email id - ${currentAllotment.assignee.emailAddress}`
      );

    if (!['Given', 'WIP'].includes(currentAllotment.status))
      warnings.push(`Status of file is ${currentAllotment.status || 'Spare'}`);

    if (!fileSnapshot.exists())
      warnings.push(`Audio file name ${fileName} is not found in the backend!`);

    if (currentSet.filter((allotment: any) => allotment.status === 'Given').length === 1)
      warnings.push("It's time to allot!");

    admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'sqr-submission',
        to: coordinator.email_address,
        params: {
          currentSet,
          submission: { fileName, ...submission },
          warnings,
          allotmentUrl: getAllotmentLink(submission.author.emailAddress),
          updateUrl: getSubmissionUpdateLink(fileName, token),
        },
      });
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

    const spreadsheet = await Spreadsheet.open(functions.config().sqr.spreadsheet_id);
    importSubmissions();
    importAllotments();

    ////////////////////////
    //     Submissions
    ////////////////////////
    async function importSubmissions() {
      const sheet = await spreadsheet.useSheet(ISoundQualityReportSheet.Submissions);
      await admin.database().ref('/submissions/soundQualityReporting').update(
        (await sheet.getRows()).reduce((result, row) => {
          const fileName = row['Audio File Name'];
          const list = helpers.extractListFromFilename(fileName);
          const token = /.*token=([\w-]+)/.exec(row['Update Link'])[1];

          result[`${list}/${fileName}/${token}`] = {
            completed: row['Completed'] || null,
            created: row['Completed'] || null,
            changed: row['Updated'] || null,
            comments: row['Comments'],
            soundIssues: parseAudioChunkRemark(row['Sound Issues']),
            soundQualityRating: row['Sound Quality Rating'],
            unwantedParts: parseAudioChunkRemark(row['Unwanted Parts']),
            duration: {
              beginning: row['Beginning'],
              ending: row['Ending'],
            },
            imported: true,
          };
          return result;
        }, {})
      );
    }

    ////////////////////////
    //     Allotments
    ////////////////////////
    async function importAllotments() {
      const sheet = await spreadsheet.useSheet(ISoundQualityReportSheet.Allotments);
      await admin.database().ref('/original').update(
        (await sheet.getRows()).reduce((result, row) => {
          const fileName = row['File Name'];

          const fileNameHasForbiddenChars = fileName.match(/[\.\[\]$#]/g);
          if (fileNameHasForbiddenChars) {
            console.warn(
              `File "${fileName}" has forbidden characters that can't be used as a node name.`
            );
            return result;
          }

          const list = helpers.extractListFromFilename(fileName);
          result[`${list}/${fileName}/soundQualityReporting`] = {
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
            notes: row['Notes'] || null
          };

          return result;
        }, {})
      );
    }
  });

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

function getSubmissionUpdateLink(fileName: string, token: string): URL {
  return new URL(
    `/form/sound-quality-report/${fileName}/${token}/`,
    functions.config().website.base_url
  );
}

function getAllotmentLink(emailAddress: string): URL {
  const url = new URL(
    '/sqr/allot',
    functions.config().website.base_url
  );
  url.searchParams.set('emailaddress', emailAddress);
  return url;
}

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
  async ({ fileName, comments, token, reason }) => {
    const listId = helpers.extractListFromFilename(fileName);
    const file = await admin.database().ref(
      `original/${listId}/${fileName}`
    ).orderByChild("token").equalTo(token).once("value");
    const originalFile = file.val();
    if (!originalFile) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid token")
    }
    return file.ref.update({
      "soundQualityReporting/status": reason === "unable to play" ? "Audio Problem" : "",
      "soundQualityReporting/timestampGiven": null,
      "soundQualityReporting/notes": `${originalFile.soundQualityReporting.notes}\n ${comments}`
    })
  }
);
