/*!
 * sri sri guru gauranga jayatah
 */

import { database } from 'firebase-admin';
import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { getDiff } from 'recursive-diff';
import { DateTimeConverter } from '../DateTimeConverter';
import { Spreadsheet } from '../Spreadsheet';
import { StorageFileReference } from '../StorageFileReference';
import { StorageManager } from '../StorageManager';
import { modificationTime } from '../modification-time';
import { ContentDetails } from './ContentDetails';
import {
  Approval,
  FidelityCheck,
  FidelityCheckRecord,
} from './FidelityCheckRecord';
import { FidelityCheckRow } from './FidelityCheckRow';
import { FidelityCheckValidator } from './FidelityCheckValidator';
import { FinalRecord } from './FinalRecord';
import pMap = require('p-map');

const dateToEndOfDay = (date: DateTime) =>
  date === date.startOf('day') ? date.endOf('day') : date;

export const validateRecords = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .pubsub.schedule('every day 18:30')
  .timeZone(functions.config().coordinator.timezone)
  .onRun(async () => {
    const sheet = await Spreadsheet.open<FidelityCheckRow>(
      functions.config().fc.spreadsheet.id,
      'Fidelity Check'
    );

    /// Getting spreadsheet rows and database snapshot and files listings in parallel
    const [rows, snapshot] = await Promise.all([
      sheet.getRows(),
      database().ref('/FC/records').once('value'),
    ]);

    const validator = new FidelityCheckValidator();

    const makeKeys = <K extends ReadonlyArray<keyof FidelityCheckRow>>(
      keys: K
    ) => keys;
    const STRING_COLUMNS = makeKeys([
      'AM/PM',
      'Category',
      'Date (yyyymmdd format)',
      'Lecture Language',
      'Location',
      'Other Guru-varga',
      'Series/Sastra Inputs',
      'Sound Rating',
      'Suggested Title',
      'Topics',
    ]);
    const BOOLEAN_COLUMNS = makeKeys([
      'Date uncertain',
      'Location uncertain',
      'Topics Ready',
      'Ready For Archive',
      'Fidelity Checked',
    ]);

    const processRow = async (
      row: FidelityCheckRow,
      index: number
    ): Promise<string> => {
      // Normalizing input data: fixing humans’ mistypings
      STRING_COLUMNS.forEach((key) => {
        row[key] = row[key]?.toString()?.trim() || null;
      });
      BOOLEAN_COLUMNS.forEach((key) => {
        row[key] = row[key] || false;
      });

      // Skipping rows with empty Task ID
      if (!row['Task ID']) return null;

      // Validating the format of the Task ID
      if (!/^[A-Z]+\d*-\d+-\d+$/.test(row['Task ID']))
        return 'Invalid Task ID.';

      if (rows.findIndex((x) => x['Task ID'] === row['Task ID']) < index)
        return 'Duplicate Task ID.';

      const recordSnapshot = snapshot.child(row['Task ID']);
      const existingRecord = recordSnapshot.val() as FidelityCheckRecord;

      /**
       * Removing the approval from the database if Ready For Archive is `false`
       * Doing this early ensures unpublishing of a file even if there are validation issues
       */

      if (row['Ready For Archive'] === false && existingRecord?.approval) {
        functions.logger.info('Removing approval from', row['Task ID']);
        await recordSnapshot.ref.update({
          approval: null,
        });
      }

      if (row['Fidelity Checked'] !== true) {
        // Removing the fidelity check from the database
        if (existingRecord?.fidelityCheck)
          await recordSnapshot.ref.update({
            fidelityCheck: null,
          });

        // Until fidelity check is done, there is nothing to validate
        return null;
      }

      /**
       * Basic row validation
       */

      const result = validator.validate(row, index, rows);
      if (!result.isValid)
        return ['Data is invalid:', ...result.messages].join('\n');

      if (!Number.isFinite(row['FC Date'])) return 'Invalid FC Date.';

      const fidelityCheck: FidelityCheck = {
        // If the FC time is midnight, it means that the date was entered manually during this day.
        // Hence, using the end of that day to ensure correct comparison to the file time.
        timestamp: dateToEndOfDay(
          DateTimeConverter.fromSerialDate(row['FC Date'], sheet.timeZone)
        ).toMillis(),
        author: row['FC Initials'],
      };

      const file = await StorageManager.getMostRecentFile(
        StorageManager.getCandidateFiles(row['Task ID'])
      );
      if (!file) return 'File not found';

      const fileCreationTime = modificationTime(file);

      // The FC Date should be later than the time when the file was created.
      if (fileCreationTime.toMillis() > fidelityCheck.timestamp)
        return `File was created on ${fileCreationTime.toISODate()}, after Fidelity Check.`;

      const fileReference: StorageFileReference = {
        bucket: file.bucket.name,
        name: file.name,
        generation: file.metadata.generation,
      };

      if (
        existingRecord &&
        existingRecord.file &&
        existingRecord.fidelityCheck &&
        fidelityCheck.timestamp <= existingRecord.fidelityCheck.timestamp
      ) {
        // Comparing file info if the FC Date was not bumped
        if (getDiff(existingRecord.file, fileReference).length)
          // It is unlikely we get here due to the dates comparison earlier. But as a safety net we keep this check.
          return 'Fidelity Check was done against another file version.';
      }
      // Updating the database if the FC Date was bumped
      else
        await recordSnapshot.ref.update({
          file: fileReference,
          fidelityCheck,
        });

      /**
       * Checking for the content changes after approval
       */

      if (row['Ready For Archive'] !== true)
        return 'Awaiting Ready For Archive.';

      if (!Number.isFinite(row['Finalization Date']))
        return 'Invalid Finalization Date.';

      const approval: Approval = {
        timestamp: dateToEndOfDay(
          DateTimeConverter.fromSerialDate(
            row['Finalization Date'],
            sheet.timeZone
          )
        ).toMillis(),
        topicsReady: row['Topics Ready'],
      };

      if (approval.timestamp < fidelityCheck.timestamp)
        return 'Finalization Date must be greater than FC Date.';

      const contentDetailsMapping = new Map<
        keyof ContentDetails,
        keyof FidelityCheckRow
      >([
        ['title', 'Suggested Title'],
        ['topics', 'Topics'],
        ['date', 'Date (yyyymmdd format)'],
        ['dateUncertain', 'Date uncertain'],
        ['timeOfDay', 'AM/PM'],
        ['location', 'Location'],
        ['locationUncertain', 'Location uncertain'],
        ['category', 'Category'],
        ['languages', 'Lecture Language'],
        ['percentage', 'Srila Gurudeva Timing'],
        ['otherSpeakers', 'Other Guru-varga'],
        ['seriesInputs', 'Series/Sastra Inputs'],
        ['soundQualityRating', 'Sound Rating'],
      ]);

      // Constructing the content details
      const contentDetails = Object.fromEntries(
        [...contentDetailsMapping.entries()].map(([key, columnName]) => [
          key,
          row[columnName],
        ])
      ) as unknown as ContentDetails;

      if (
        existingRecord?.approval &&
        approval.timestamp <= existingRecord.approval.timestamp
      ) {
        const changedColumns = getDiff(
          existingRecord.contentDetails,
          contentDetails,
          true // keep old values
        )
          .filter(
            (d) =>
              // Ignore topics changes if they were not approved earlier
              (existingRecord.approval?.topicsReady ||
                d.path[0] !== 'topics') &&
              // Absent value from Firebase is undefined, but `null` in the spreadsheet
              !(d.op === 'add' && d.val === null)
          )
          .map((d) =>
            contentDetailsMapping.get(d.path[0] as keyof ContentDetails)
          );

        if (changedColumns.length)
          return `Changed after finalization: ${changedColumns.join(', ')}.`;
      }
      // Updating the database if the Finalization Date was bumped
      else await recordSnapshot.ref.update({ approval, contentDetails });

      return 'OK';
    };

    const spreadsheetStatuses = await pMap(rows, processRow, {
      // More than 5000 causes TeenyStatisticsWarning: Possible excessive concurrent requests detected.
      concurrency: 100,
    });

    await sheet.updateColumn('Validation Status', spreadsheetStatuses);
  });

export const exportForArchive = functions
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .pubsub.topic('finalize')
  .onPublish(async () => {
    const snapshot = await database().ref('/FC/records').once('value');
    if (!snapshot.exists()) return;

    const coalesceUnknown = (input: string): string | null =>
      input?.toUpperCase() === 'UNKNOWN' ? null : input;

    /**
     * Since we are using integer keys, Firebase can return either array or map:
     * https://firebase.googleblog.com/2014/04/best-practices-arrays-in-firebase.html
     * For this reason we're using `Object.entries` which work identical for both data structures.
     */
    const records = Object.entries(
      snapshot.val() as Record<string, FidelityCheckRecord>
    )
      .filter(([, record]) => record.approval)
      .map<[string, FinalRecord]>(
        ([id, { approval, file, contentDetails }]) => [
          id,
          {
            file,
            contentDetails: {
              ...contentDetails,
              date: DateTimeConverter.standardizePseudoIsoDate(
                coalesceUnknown(contentDetails.date)
              ),
              dateUncertain: coalesceUnknown(contentDetails.date)
                ? contentDetails.dateUncertain
                : null,
              location: coalesceUnknown(contentDetails.location),
              locationUncertain: coalesceUnknown(contentDetails.location)
                ? contentDetails.locationUncertain
                : null,
              topicsReady: approval.topicsReady,
            },
          },
        ]
      );
    await database().ref('/final/records').set(Object.fromEntries(records));
  });
