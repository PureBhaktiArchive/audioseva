/*
 * sri sri guru gauranga jayatah
 */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as _ from 'lodash';
import { DateTime } from 'luxon';
import { Chunk } from '../classes/Chunk';
import { DateTimeConverter } from '../classes/DateTimeConverter';
import { Spreadsheet } from '../classes/GoogleSheets';
import { Track } from '../classes/Track';
import * as helpers from '../helpers';

export enum SheetNames {
  Allotments = 'Allotments',
  Submissions = 'Submissions',
}

export const copySubmissionsToProcessing = functions.pubsub
  .topic('daily-tick')
  .onPublish(async () => {
    const sourceSpreadsheet = await Spreadsheet.open(
      functions.config().cr.submissions.spreadsheet.id
    );
    const onlineSheet = await sourceSpreadsheet.useSheet('Online');

    const destSpreadsheet = await Spreadsheet.open(
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

  const spreadsheet = await Spreadsheet.open(
    functions.config().cr.allotments.spreadsheet.id
  );
  const allotmentsSheet = await spreadsheet.useSheet(SheetNames.Allotments);

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
  async ({ list, languages, count }, context) => {
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
      functions.config().cr.allotments.spreadsheet.id
    );
    const allotmentsSheet = await spreadsheet.useSheet(SheetNames.Allotments);

    const allotmentsRows = await allotmentsSheet.getRows();

    return allotmentsRows
      .filter(
        item =>
          !item['Status'] &&
          item['List'] === list &&
          languages.includes(item['Language'] || 'None')
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

    const spreadsheet = await Spreadsheet.open(
      functions.config().cr.allotments.spreadsheet.id
    );
    const sheet = await spreadsheet.useSheet(SheetNames.Allotments);
    const fileNameColumn = await sheet.getColumn('File Name');
    const emailColumn = await sheet.getColumn('Email');

    /// Update files in the Allotments sheet, in parallel
    await Promise.all(
      files.map(async file => {
        const index = fileNameColumn.indexOf(file.filename);
        if (index < 0) {
          console.warn(
            `File ${file.filename} is not found in the CR allotments.`
          );
          return;
        }
        const rowNumber = index + 1;
        const row = await sheet.getRow(rowNumber);
        row['Date Given'] = DateTimeConverter.toSerialDate(DateTime.local());
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
          date: DateTime.local().toFormat('dd.MM'),
          repeated: emailColumn.indexOf(assignee.emailAddress) > 0,
        },
      });
  }
);

/**
 * Imports procesessed submissions from the spreadsheet
 */
export const importProcessedSubmissions = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB',
  })
  .pubsub.topic('import-chunks')
  .onPublish(async () => {
    const spreadsheet = await Spreadsheet.open(
      functions.config().cr.processing.spreadsheet.id
    );

    const warnings = new Map<string, Set<string>>();
    for (const sheetName of spreadsheet.sheetNames) {
      const sheet = await spreadsheet.useSheet(sheetName);

      // Skip sheets not having Beginning and Ending columns
      if (
        !sheet.headers.includes('Beginning') ||
        !sheet.headers.includes('Ending')
      )
        continue;

      const groups = _.groupBy(
        (await sheet.getRows()).map(row => Chunk.createFromRow(row)),
        chunk => chunk.fileName
      );

      for (const fileName in groups) {
        /// File name should belong to the list identified by the sheet name
        if (helpers.extractListFromFilename(fileName) !== sheetName) {
          console.warn(
            `Skipping file ${fileName} found on sheet ${sheetName}.`
          );
          continue;
        }

        const track = new Track(groups[fileName]);

        if (!track.allHasResolution) {
          console.log(
            `Skipping ${fileName} as some chunks don't have resolution.`
          );
          continue;
        }

        const trackWarnings = track.warnings;

        const ref = admin.database().ref(`/chunks/${sheetName}/${fileName}`);
        const snapshot = await ref.once('value');

        /// Chunks should not have been changed after previous import
        if (snapshot.exists()) {
          if (
            !_(track.chunks).isEqualWith(
              snapshot.val(),
              (a: Chunk, b: Chunk) =>
                a.beginning === b.beginning &&
                a.ending === a.ending &&
                a.continuationFrom === b.continuationFrom
            )
          )
            trackWarnings.push(
              'Chunks were imported and then changed in the spreadsheet'
            );
        }

        if (trackWarnings) warnings.set(fileName, new Set(trackWarnings));
        else await ref.set(track.chunks);
      }
    }

    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'cr-processed-submissions-import-summary',
        to: functions.config().coordinator.email_address,
        params: { warnings },
      });
  });
