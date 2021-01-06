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
      if (row['Fidelity Checked'] !== true || row['Done files'] !== true)
        return null;

      // Then a series of sanity checks are performed

      // All rows should have a valid FC Date
      if (!Number.isFinite(row['FC Date'])) return 'No FC Date';

      const file = await StorageManager.getMostRecentFile(
        StorageManager.getCandidateFiles(row['Task ID'])
      );
      if (!file) return 'File not found';

      const fileCreationTime = DateTime.fromISO(file.metadata.timeCreated, {
        zone: sheet.timeZone, // Using sheet's timeZone to make date comparison below correct
      });

      const fidelityCheckDate = DateTimeConverter.fromSerialDate(
        row['FC Date'],
        sheet.timeZone
      );

      // The FC Date should be later than the file was created.
      // Comparing the beginning of day of the file creation time
      // because the fidelity check date is date only, without time portion.
      if (fileCreationTime.startOf('day') > fidelityCheckDate)
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
          timestamp: fidelityCheckDate.toMillis(),
          approved: row['Ready For Archive'],
          author: row.Initials,
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
       * If the record exists in the database,
       * and FC Date in the spreadsheet is not newer,
       * then comparing the records.
       */
      if (
        existingRecord &&
        record.fidelityCheck.timestamp <= existingRecord.fidelityCheck.timestamp
      ) {
        const differences = getDiff(existingRecord, record, true).filter(
          (d) =>
            // Ignore fidelityCheck changes
            d.path[0] !== 'fidelityCheck' &&
            // Check if the values really changed, using the “falsey” logic
            !(d.op !== 'add' ? d.oldVal : undefined) !==
              !(d.op !== 'delete' ? d.val : undefined)
        );

        if (differences.length) {
          return `Changed: ${differences
            .map(
              (d) =>
                backMapping[
                  d.path[0] === 'contentDetails' ? d.path[1] : d.path[0]
                ]
            )
            .join(', ')}`;
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
