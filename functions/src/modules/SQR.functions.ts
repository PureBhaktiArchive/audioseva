/*
 * sri sri guru gauranga jayatah
 */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { URL } from 'url';
import { RowUpdateMode, Spreadsheet } from '../classes/GoogleSheets';
import * as helpers from './../helpers';
import uuidv4 = require('uuid/v4');

class SQR {
  static createSubmissionLink(fileName: string, token: string): string {
    return new URL(
      `form/sound-quality-report/${encodeURIComponent(
        fileName
      )}/${encodeURIComponent(token)}`,
      `https://app.${functions.config().project.domain}`
    ).toString();
  }

  static createListenLink(fileName: string): string {
    const url = new URL(
      `listen/${encodeURIComponent(fileName)}`,
      functions.config().website.old.base_url
    );
    url.searchParams.set('seva', 'sqr');
    return url.toString();
  }

  static createAllotmentLink(emailAddress: string): string {
    const url = new URL(
      `https://app.${functions.config().project.domain}/sqr/allot`
    );
    url.searchParams.set('emailAddress', emailAddress);
    return url.toString();
  }

  static createSelfTrackingLink(emailAddress: string): string {
    const url = new URL(
      'https://hook.integromat.com/swlpnplbb3dilsmdxyc7vixjvenvh65a'
    );
    url.searchParams.set('email_address', emailAddress);
    return url.toString();
  }
}

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

    console.log(
      `Allotting ${files.map(file => file.filename).join(', ')} to ${
        assignee.emailAddress
      }`
    );

    // Update the allotments in the database
    const updates = {};
    const tokens = new Map<string, string>();

    files.forEach(async ({ filename: fileName }) => {
      tokens.set(fileName, uuidv4());

      const list = helpers.extractListFromFilename(fileName);
      const pathPrefix = `${list}/${fileName}/soundQualityReporting`;
      updates[`${pathPrefix}/status`] = 'Given';
      updates[`${pathPrefix}/timestampGiven`] =
        admin.database.ServerValue.TIMESTAMP;
      updates[`${pathPrefix}/assignee`] = assignee;
      updates[`${pathPrefix}/token`] = tokens.get(fileName);
    });

    await admin
      .database()
      .ref(`/original`)
      .update(updates);

    const spreadsheet = await Spreadsheet.open(
      functions.config().sqr.spreadsheet_id
    );
    const sheet = await spreadsheet.useSheet(
      ISoundQualityReportSheet.Allotments
    );
    const emailColumn = await sheet.getColumn('Email');

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
          files: files.map(({ filename: fileName }) => ({
            name: fileName,
            links: {
              listen: SQR.createListenLink(fileName),
              submission: SQR.createSubmissionLink(
                fileName,
                tokens.get(fileName)
              ),
            },
          })),
          assignee,
          comment,
          date: DateTime.local().toFormat('dd.MM'),
          repeated: emailColumn.indexOf(assignee.emailAddress) >= 0,
          links: {
            selfTracking: SQR.createSelfTrackingLink(assignee.emailAddress),
          },
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
  .onWrite(async (change, { authType, params: { list, fileName, token } }) => {
    // Ignore admin changes, only user submissions are processed
    if (authType === 'ADMIN') {
      console.log(
        `Ignoring change to ${fileName}/${token} submission by ADMIN.`
      );
      return;
    }

    // Ignore deletions
    if (!change.after.exists()) {
      console.log(`Ignoring deletion of ${fileName}/${token} submission.`);
      return;
    }

    const submission = change.after.val();

    // Ignore draft submissions
    if (!submission.completed) {
      console.log(`Ignoring draft of ${fileName}/${token} submission.`);
      return;
    }

    const fileSnapshot = await admin
      .database()
      .ref(`/original/${list}/${fileName}`)
      .once('value');

    if (!fileSnapshot.exists())
      console.warn(`File ${fileName} is not found in the database.`);

    const allotmentRef = fileSnapshot.ref.child('soundQualityReporting');

    await allotmentRef.update({ status: 'WIP' });

    const currentAllotment = (await allotmentRef.once('value')).val();

    await change.after.ref.update({
      author: currentAllotment.assignee,
    });

    // * Update the spreadsheet

    const spreadsheet = await Spreadsheet.open(
      functions.config().sqr.spreadsheet_id
    );
    const sheet = await spreadsheet.useSheet(
      ISoundQualityReportSheet.Submissions
    );

    const row = {
      Completed: helpers.convertToSerialDate(
        DateTime.fromMillis(submission.completed)
      ),
      Updated: helpers.convertToSerialDate(
        DateTime.fromMillis(submission.changed)
      ),
      'Update Link': SQR.createSubmissionLink(fileName, token),
      'Audio File Name': fileName,
      'Unwanted Parts': formatMultilineComment(submission.unwantedParts),
      'Sound Issues': formatMultilineComment(submission.soundIssues),
      'Sound Quality Rating': submission.soundQualityRating,
      Beginning: submission.duration ? submission.duration.beginning : null,
      Ending: submission.duration ? submission.duration.ending : null,
      Comments: submission.comments,
      Name: currentAllotment.assignee.name,
      'Email Address': currentAllotment.assignee.emailAddress,
    };

    if (change.before.exists())
      await sheet.updateOrAppendRow('Audio File Name', fileName, row);
    else await sheet.appendRow(row);

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
      const datetimeGiven = DateTime.fromMillis(
        value.soundQualityReporting.timestampGiven
      );
      currentSet.push({
        fileName: child.key,
        dateGiven: datetimeGiven.toLocaleString(DateTime.DATE_SHORT),
        status: value.soundQualityReporting.status,
        daysPassed: DateTime.local()
          .diff(datetimeGiven, ['days', 'hours'])
          .toObject().days,
      });
      return false;
    });

    const warnings = [];
    if (submission.changed !== submission.completed)
      warnings.push('This is an updated submission!');

    if (
      currentAllotment.assignee.emailAddress !== submission.author.emailAddress
    )
      warnings.push(
        `File is alloted to another email id - ${currentAllotment.assignee.emailAddress}`
      );

    if (!['Given', 'WIP'].includes(currentAllotment.status))
      warnings.push(`Status of file is ${currentAllotment.status || 'Spare'}`);

    if (!fileSnapshot.exists())
      warnings.push(`Audio file name ${fileName} is not found in the backend!`);

    if (
      currentSet.filter((allotment: any) => allotment.status === 'Given')
        .length === 1
    )
      warnings.push("It's time to allot!");

    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'sqr-submission',
        replyTo: submission.author.emailAddress,
        to: coordinator.email_address,
        params: {
          currentSet,
          submission: { fileName, ...submission },
          warnings,
          allotmentUrl: SQR.createAllotmentLink(submission.author.emailAddress),
          updateUrl: SQR.createSubmissionLink(fileName, token),
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
      !functions.config().emulator &&
      (!context.auth || !context.auth.token || !context.auth.token.coordinator)
    ) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'The function must be called by an authenticated coordinator.'
      );
    }

    const spreadsheet = await Spreadsheet.open(
      functions.config().sqr.spreadsheet_id
    );
    await Promise.all([importSubmissions(), importAllotments()]);

    ////////////////////////
    //     Submissions
    ////////////////////////
    async function importSubmissions() {
      const sheet = await spreadsheet.useSheet(
        ISoundQualityReportSheet.Submissions
      );
      const updates = {};
      (await sheet.getRows()).forEach(row => {
        const fileName = row['Audio File Name'];
        const list = helpers.extractListFromFilename(fileName);
        const token = /.*token=([\w-]+)/.exec(row['Update Link'])[1];

        updates[`${list}/${fileName}/${token}`] = {
          completed: helpers
            .convertFromSerialDate(row['Completed'], spreadsheet.timeZone)
            .toMillis(),
          created: helpers
            .convertFromSerialDate(row['Completed'], spreadsheet.timeZone)
            .toMillis(),
          changed: helpers
            .convertFromSerialDate(row['Updated'], spreadsheet.timeZone)
            .toMillis(),
          comments: row['Comments'],
          soundIssues: parseAudioChunkRemark(row['Sound Issues']),
          soundQualityRating: row['Sound Quality Rating'],
          unwantedParts: parseAudioChunkRemark(row['Unwanted Parts']),
          duration: {
            //TODO: sanitze duration
            beginning: row['Beginning'],
            ending: row['Ending'],
          },
          author: {
            emailAddress: row['Email Address'],
            name: row['Name'],
          },
          imported: true,
        };
      });
      await admin
        .database()
        .ref('/submissions/soundQualityReporting')
        .update(updates);
    }

    ////////////////////////
    //     Allotments
    ////////////////////////
    async function importAllotments() {
      const sheet = await spreadsheet.useSheet(
        ISoundQualityReportSheet.Allotments
      );
      const updates = {};
      (await sheet.getRows()).forEach(row => {
        const fileName = row['File Name'];

        if (fileName.match(/[\.\[\]$#]/g)) {
          console.warn(
            `File "${fileName}" has forbidden characters that can't be used as a node name.`
          );
          return;
        }

        const list = helpers.extractListFromFilename(fileName);
        if (!list) {
          console.warn(
            `Cannot get list name from tht file name "${fileName}".`
          );
          return;
        }

        updates[`${list}/${fileName}/soundQualityReporting`] = {
          status: row['Status'] || 'Spare',
          timestampGiven: row['Date Given']
            ? helpers
                .convertFromSerialDate(row['Date Given'], spreadsheet.timeZone)
                .toMillis()
            : null,
          timestampDone: row['Date Done']
            ? helpers
                .convertFromSerialDate(row['Date Done'], spreadsheet.timeZone)
                .toMillis()
            : null,
          assignee: {
            emailAddress: row['Email'],
            name: row['Devotee'],
          },
          notes: row['Notes'],
        };
      });

      await admin
        .database()
        .ref('/original')
        .update(updates, error => {
          console.log('Result of Allotments update: ', error);
        });
    }
  }
);

/**
 * On creation of a new allotment record id, update and sync data values to Google Spreadsheets
 *
 */
export const exportAllotmentToSpreadsheet = functions.database
  .ref('/original/{listName}/{fileName}/soundQualityReporting')
  .onWrite(async (change, { params: { fileName } }) => {
    // Ignore deletions
    if (!change.after.exists()) {
      console.log(`Ignoring deletion of ${fileName}.`);
      return;
    }

    const changedValues = change.after.val();

    const spreadsheet = await Spreadsheet.open(
      functions.config().sqr.spreadsheet_id
    );
    const sheet = await spreadsheet.useSheet(
      ISoundQualityReportSheet.Allotments
    );

    const rowNumber = await sheet.findRowNumber('File Name', fileName);
    if (!rowNumber)
      throw new Error(
        `File ${fileName} is not found in the SQR allotments sheet.`
      );

    const row = {
      'Date Given': changedValues.timestampGiven
        ? helpers.convertToSerialDate(
            DateTime.fromMillis(changedValues.timestampGiven)
          )
        : null,
      Notes: changedValues.notes,
      Status: changedValues.status.replace('Spare', ''),
      Devotee: changedValues.assignee ? changedValues.assignee.name : null,
      Email: changedValues.assignee
        ? changedValues.assignee.emailAddress
        : null,
      'Date Done': changedValues.timestampDone
        ? helpers.convertToSerialDate(
            DateTime.fromMillis(changedValues.timestampDone)
          )
        : null,
    };
    await sheet.updateRow(rowNumber, row, RowUpdateMode.Partial);
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
): string {
  if (!audioDescriptionList || !audioDescriptionList.length) return null;

  return audioDescriptionList
    .map(
      item =>
        `${item.beginning}–${item.ending}: ${item.type} — ${item.description}`
    )
    .join('\n');
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
    const list = helpers.extractListFromFilename(fileName);
    const snapshot = await admin
      .database()
      .ref(`original/${list}/${fileName}`)
      .orderByChild('token')
      .equalTo(token)
      .once('value');

    if (!snapshot.exists()) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid token');
    }

    const allotment = snapshot.val().soundQualityReporting;
    await snapshot.ref.update({
      soundQualityReporting: {
        notes: [allotment.notes, comments].filter(Boolean).join('\n'),
        status: reason === 'unable to play' ? 'Audio Problem' : 'Spare',
      },
      timestampGiven: null,
      token: null,
    });
  }
);
