import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as helpers from '../helpers';
import GoogleSheets from '../services/GoogleSheets';
import * as _ from 'lodash';
import * as moment from 'moment';

export enum ISoundQualityReportSheet {
  Allotments = 'Allotments',
  Submissions = 'Submissions',
}

export const copySubmissionsToProcessing = functions.pubsub
  .topic('daily-tick')
  .onPublish(async () => {
    const onlineSheet = await new GoogleSheets(
      functions.config().cr.submissions.spreadsheet.id
    ).useSheet('Online');

    const destSpreadsheet = new GoogleSheets(
      functions.config().cr.processing.spreadsheet.id
    );
    const destinations = new Map();

    for (const row of await onlineSheet.getRows()) {
      const list = helpers.extractListFromFilename(row['Audio File Name']);

      if (!destinations.has(list)) {
        const sheet = await destSpreadsheet.useSheet(list);

        /// We are not creating new sheets
        if (!sheet) continue;

        destinations.set(list, {
          sheet,
          submissionSerials: await sheet.getColumn('Submission Serial'),
          audioFileNames: await sheet.getColumn('Audio File Name'),
          insertionsCounter: [],
          rows: [],
        });
      }

      const destination = destinations.get(list);

      /// Skipping rows that were already copied
      if (destination.submissionSerials.indexOf(row['Submission Serial']) > -1)
        continue;

      const originalIndex = _.sortedIndex(
        destination.submissionSerials,
        row['Submission Serial']
      );

      /// Correcting index according to the pending insertions
      const correctedIndex = destination.insertionsCounter.reduce(
        (sum: number, value: number, index: number) =>
          sum + (index <= originalIndex ? value : 0),
        originalIndex
      );

      destination.rows[correctedIndex] = row;

      ++destination.insertionsCounter[originalIndex] ||
        (destination.insertionsCounter[originalIndex] = 1);
    }

    /// Actually inserting the rows for each sheet
    for (const destination of destinations.values())
      await destination.sheet.addRows(destination.rows);

    return true;
  });

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

  const gsheets = new GoogleSheets(functions.config().cr.spreadsheet_id);
  const allotmentsSheet = await gsheets.useSheet(
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

    const gsheets = new GoogleSheets(functions.config().cr.spreadsheet_id);
    const allotmentsSheet = await gsheets.useSheet(
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

    const gsheets = new GoogleSheets(functions.config().cr.spreadsheet_id);
    const sheet = await gsheets.useSheet(ISoundQualityReportSheet.Allotments);
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
        template: 'cr-allotment',
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
