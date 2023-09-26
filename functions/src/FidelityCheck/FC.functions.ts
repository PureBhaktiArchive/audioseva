/*!
 * sri sri guru gauranga jayatah
 */

import { database } from 'firebase-admin';
import * as functions from 'firebase-functions';
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
      'Fidelity Checked without topics',
    ]);

    const spreadsheetStatuses = await pMap(
      rows,
      async (row, index) => {
        // Normalizing input data: fixing humans’ mistypings
        STRING_COLUMNS.forEach((key) => {
          row[key] = row[key]?.toString()?.trim() || null;
        });
        BOOLEAN_COLUMNS.forEach((key) => {
          row[key] = row[key] || false;
        });

        // Checking for sanity of Archive ID
        if (!Number.isFinite(row['Archive ID'])) return 'No Archive ID.';

        if (
          rows.findIndex((x) => x['Archive ID'] === row['Archive ID']) < index
        )
          return 'Duplicate Archive ID.';

        const recordSnapshot = snapshot.child(row['Archive ID'].toString());
        const existingRecord = recordSnapshot.val() as FidelityCheckRecord;

        // Removing the approval from the database if Ready For Archive is `false`
        // Doing this early ensures unpublishing of a file even if there are validation issues
        if (row['Ready For Archive'] === false && existingRecord?.approval) {
          functions.logger.info('Removing approval from', row['Archive ID']);
          await recordSnapshot.ref.update({
            approval: null,
          });
        }

        if (
          row['Fidelity Checked'] !== true &&
          row['Fidelity Checked without topics'] !== true
        ) {
          // Removing the fidelity check from the database
          await recordSnapshot.ref.update({
            fidelityCheck: null,
          });

          return null;
        }

        // Basic row validation
        const result = validator.validate(row, index, rows);
        if (!result.isValid)
          return ['Data is invalid:', ...result.messages].join('\n');

        /**
         * Validating Fidelity Check
         */

        const file = await StorageManager.getMostRecentFile(
          StorageManager.getCandidateFiles(row['Task ID'])
        );
        if (!file) return 'File not found';

        const fileCreationTime = modificationTime(file);

        let fidelityCheckTime = DateTimeConverter.fromSerialDate(
          // General fidelity check supercedes the quick one (without topics)
          row['Fidelity Checked']
            ? row['FC Date']
            : row['FC Date without topics'],
          sheet.timeZone
        );

        /**
         * If the date is midnight, it means that the date was entered manually during this day.
         * Hence, using the end of that day as an “exact” FC time.
         */
        if (fidelityCheckTime === fidelityCheckTime.startOf('day'))
          fidelityCheckTime = fidelityCheckTime.endOf('day');

        // The FC Date should be later than the time when the file was created.
        if (fileCreationTime > fidelityCheckTime)
          return `File was created on ${fileCreationTime.toISODate()}, after Fidelity Check on ${fidelityCheckTime.toISODate()}.`;

        const fileReference: StorageFileReference = {
          bucket: file.bucket.name,
          name: file.name,
          generation: file.metadata.generation,
        };
        const fidelityCheck: FidelityCheck = {
          timestamp: fidelityCheckTime.toMillis(),
          author: row['FC Initials'],
        };

        if (
          // Using -Infinity to make sure that in absense of existing record the new record will be considered newer
          fidelityCheck.timestamp <=
          (existingRecord?.fidelityCheck?.timestamp || -Infinity)
        ) {
          // Comparing file info if the FC Date was not bumped
          if (getDiff(existingRecord.file, fileReference).length)
            return 'File was updated since last fidelity check.';
        }
        // Updating the database if the FC Date was bumped
        else
          await recordSnapshot.ref.update({
            file: fileReference,
            fidelityCheck,
          });

        if (row['Ready For Archive'] !== true)
          return 'Awaiting Ready For Archive.';

        const approval: Approval = {
          timestamp: DateTimeConverter.fromSerialDate(
            row['Finalization Date'],
            sheet.timeZone
          ).toMillis(),
          topicsReady: row['Topics Ready'],
        };

        const contentDetails: ContentDetails = {
          title: row['Suggested Title'],
          topics: row.Topics,
          date: row['Date (yyyymmdd format)'],
          dateUncertain: row['Date uncertain'],
          timeOfDay: row['AM/PM'],
          location: row.Location,
          locationUncertain: row['Location uncertain'],
          category: row.Category,
          languages: row['Lecture Language'],
          percentage: row['Srila Gurudeva Timing'],
          otherSpeaker: row['Other Guru-varga'],
          seriesInputs: row['Series/Sastra Inputs'],
          soundQualityRating: row['Sound Rating'],
        };

        const backMapping: Record<
          keyof ContentDetails,
          keyof FidelityCheckRow
        > = {
          title: 'Suggested Title',
          topics: 'Topics',
          date: 'Date (yyyymmdd format)',
          dateUncertain: 'Date uncertain',
          timeOfDay: 'AM/PM',
          location: 'Location',
          locationUncertain: 'Location uncertain',
          category: 'Category',
          languages: 'Lecture Language',
          percentage: 'Srila Gurudeva Timing',
          otherSpeaker: 'Other Guru-varga',
          seriesInputs: 'Series/Sastra Inputs',
          soundQualityRating: 'Sound Rating',
        };

        if (
          // Using -Infinity to make sure that in absense of existing record the new record will be considered newer
          approval.timestamp <=
          (existingRecord?.approval?.timestamp || -Infinity)
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
            .map((d) => backMapping[d.path[0]]);

          if (changedColumns.length)
            return `Changed after finalization: ${changedColumns.join(', ')}.`;
        }
        // Updating the database if the Finalization Date was bumped
        else await recordSnapshot.ref.update({ approval, contentDetails });

        return 'OK';
      },
      {
        // More than 5000 causes TeenyStatisticsWarning: Possible excessive concurrent requests detected.
        concurrency: 100,
      }
    );

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
