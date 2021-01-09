/*!
 * sri sri guru gauranga jayatah
 */

import { database } from 'firebase-admin';
import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { getDiff } from 'recursive-diff';
import { DateTimeConverter } from '../DateTimeConverter';
import { flatten } from '../flatten';
import { Spreadsheet } from '../Spreadsheet';
import { StorageManager } from '../StorageManager';
import { backMapping, FidelityCheckRecord } from './FidelityCheckRecord';
import { FidelityCheckRow } from './FidelityCheckRow';
import pMap = require('p-map');

export const validateRecords = functions
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .pubsub.schedule('every day 00:00')
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

    // Getting IDs for detecting duplicates later
    const archiveIds = rows.map((row) => row['Archive ID']);
    const taskIds = rows.map((row) => row['Task ID']);

    const databaseUpdates: Record<string, FidelityCheckRecord> = {};

    const spreadsheetStatuses = await pMap(rows, async (row, index) => {
      if (!Number.isFinite(row['Archive ID'])) return 'No Archive ID';

      // Archive Id should be unique per each row
      if (archiveIds.indexOf(row['Archive ID']) < index)
        return 'Duplicate Archive ID';

      // Task Id should be unique per each row
      if (taskIds.indexOf(row['Task ID']) < index) return 'Duplicate Task ID';

      // Take only fidelity checked rows with numeric Archive ID into consideration.
      // Also, the file should be done in TE and SE.
      if (
        (row['Fidelity Checked'] !== true &&
          row['Fidelity Checked without topics'] !== true) ||
        row['Done files'] !== true
      )
        return null;

      // Then a series of sanity checks are performed

      // General fidelity check supercedes the quick one (without topics)
      const fidelityCheckDate = row['Fidelity Checked']
        ? row['FC Date']
        : row['FC Date without topics'];

      // All rows should have a valid FC Date
      if (!Number.isFinite(fidelityCheckDate)) return 'Invalid FC Date';

      const file = await StorageManager.getMostRecentFile(
        StorageManager.getCandidateFiles(row['Task ID'])
      );
      if (!file) return 'File not found';

      const fileCreationTime = DateTime.fromISO(file.metadata.timeCreated, {
        zone: sheet.timeZone, // Using sheet's timeZone to make date comparison below correct
      });

      const fidelityCheckTime = DateTimeConverter.fromSerialDate(
        fidelityCheckDate,
        sheet.timeZone
      );

      // The FC Date should be later than the time when the file was created.
      if (
        fileCreationTime >
        (fidelityCheckTime === fidelityCheckTime.startOf('day')
          ? // If the time is midnight, it means that the date is entered manually, hence using the end of the day as a threshold
            fidelityCheckTime.endOf('day')
          : fidelityCheckTime)
      )
        return `File was created on ${fileCreationTime.toISODate()}, after Fidelity Check`;

      // Sanity checks are over. Now analyzing the record changes.

      const record: FidelityCheckRecord = {
        file: {
          bucket: file.bucket.name,
          name: file.name,
          generation: file.metadata.generation, // file.generation is undefined
        },
        taskId: row['Task ID'],
        fidelityCheck: {
          timestamp: fidelityCheckTime.toMillis(),
          author: row['FC Initials'] || null,
        },
        approval: {
          readyForArchive: row['Ready For Archive'] || false,
          timestamp: row['Finalization Date'] || null,
          topicsReady: row['Topics Ready'] || false,
        },
        contentDetails: {
          title: row['Suggested Title'],
          topics: row.Topics,
          date: row['Date (yyyymmdd format)'],
          timeOfDay: row['AM/PM'],
          location: row.Location,
          category: row.Category,
          languages: row['Lecture Language'],
          percentage: row['Srila Gurudeva Timing'],
          seriesInputs: row['Series/Sastra Inputs'],
          soundQualityRating: row['Sound Rating'],
        },
      };

      const existingRecord = snapshot
        .child(row['Archive ID'].toString())
        .val() as FidelityCheckRecord;

      /**
       * If the record exists in the database, then comparing the records.
       */
      if (existingRecord) {
        // Comparing file info if the FC Date is not bumped
        if (
          record.fidelityCheck.timestamp <=
          existingRecord.fidelityCheck.timestamp
        ) {
          if (getDiff(existingRecord.file, record.file).length)
            return 'File was updated since last fidelity check';
        }

        // If the record is approved earlier, and the Finalization Date is not bumped
        if (
          record.approval.readyForArchive &&
          (record.approval.timestamp <= existingRecord.approval.timestamp ||
            !existingRecord.approval.timestamp)
        ) {
          const changedColumns = getDiff(
            existingRecord.contentDetails,
            record.contentDetails,
            true // keep old values
          )
            .filter(
              (d) =>
                // Ignore topics changes if they were not approved earlier
                (!existingRecord.approval?.topicsReady ||
                  d.path[0] !== 'topics') &&
                // Check if the values really changed, using the “falsey” logic
                !(d.op !== 'add' ? d.oldVal : undefined) !==
                  !(d.op !== 'delete' ? d.val : undefined)
            )
            .map((d) => backMapping[d.path[0]]);

          if (changedColumns.length) {
            return `Changed: ${changedColumns.join(', ')}`;
          }
        }
      }

      databaseUpdates[row['Archive ID']] = record;

      return 'OK';
    });

    await Promise.all([
      database().ref('/FC/records').update(flatten(databaseUpdates)),
      sheet.updateColumn('Validation Status', spreadsheetStatuses),
    ]);
  });
