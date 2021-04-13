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
import { StorageFileReference } from '../StorageFileReference';
import { StorageManager } from '../StorageManager';
import { ContentDetails } from './ContentDetails';
import { FidelityCheck, FidelityCheckRecord } from './FidelityCheckRecord';
import { FidelityCheckRow } from './FidelityCheckRow';
import { FidelityCheckValidator } from './FidelityCheckValidator';
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

    const validator = new FidelityCheckValidator();
    const spreadsheetStatuses = await pMap(rows, async (row, index) => {
      // Basic row validation
      const result = validator.validate(row, index, rows);
      if (!result.isValid) return result.messages.join('\n');

      if (
        row['Fidelity Checked'] !== true &&
        row['Fidelity Checked without topics'] !== true
      )
        return 'Awaiting FC.';

      // General fidelity check supercedes the quick one (without topics)
      const fidelityCheckDate = row['Fidelity Checked']
        ? row['FC Date']
        : row['FC Date without topics'];

      const file = await StorageManager.getMostRecentFile(
        StorageManager.getCandidateFiles(row['Task ID'])
      );
      if (!file) return 'File not found';

      const fileCreationTime = DateTime.fromISO(
        file.metadata.timeCreated // ISO format, e.g. 2020-08-24T09:28:12.483Z
      );

      const fidelityCheckTime = DateTimeConverter.fromSerialDate(
        fidelityCheckDate,
        sheet.timeZone
      );

      /**
       * If the date is midnight, it means that the date was entered manually during this day.
       * Hence, using the end of that day as an “exact” FC time.
       */
      const exactFidelityCheckTime =
        fidelityCheckTime === fidelityCheckTime.startOf('day')
          ? fidelityCheckTime.endOf('day')
          : fidelityCheckTime;

      // The FC Date should be later than the time when the file was created.
      if (fileCreationTime > exactFidelityCheckTime)
        return `File was created on ${fileCreationTime.toISODate()}, after Fidelity Check on ${exactFidelityCheckTime.toISODate()}.`;

      const recordSnapshot = snapshot.child(row['Archive ID'].toString());
      const existingRecord = recordSnapshot.val() as FidelityCheckRecord;

      const fileReference: StorageFileReference = {
        bucket: file.bucket.name,
        name: file.name,
        generation: file.metadata.generation,
      };
      const fidelityCheck: FidelityCheck = {
        timestamp: exactFidelityCheckTime.toMillis(),
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
        await recordSnapshot.ref.update(
          flatten({ file: fileReference, fidelityCheck: fidelityCheck })
        );

      if (row['Ready For Archive'] !== true)
        return 'Awaiting Ready For Archive.';

      const approval = {
        readyForArchive: row['Ready For Archive'] || false,
        timestamp: DateTimeConverter.fromSerialDate(
          row['Finalization Date'],
          sheet.timeZone
        ).toMillis(),
        topicsReady: row['Topics Ready'] || false,
      };

      const contentDetails: ContentDetails = {
        title: row['Suggested Title']?.toString()?.trim(),
        topics: row.Topics?.toString()?.trim(),
        date: row['Date (yyyymmdd format)']?.toString() || null,
        dateUncertain: row['Date uncertain'] || false,
        timeOfDay: row['AM/PM']?.toString()?.trim() || null,
        location: row.Location?.toString()?.trim() || null,
        locationUncertain: row['Location uncertain'] || false,
        category: row.Category?.toString()?.trim(),
        languages: row['Lecture Language']?.toString()?.trim(),
        percentage: row['Srila Gurudeva Timing'],
        otherSpeaker: row['Other Guru-varga']?.toString()?.trim() || null,
        seriesInputs: row['Series/Sastra Inputs']?.toString()?.trim() || null,
        soundQualityRating: row['Sound Rating']?.toString()?.trim(),
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
        approval.timestamp <= (existingRecord?.approval?.timestamp || -Infinity)
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
      else
        await recordSnapshot.ref.update(flatten({ approval, contentDetails }));

      return 'OK';
    });

    await sheet.updateColumn('Validation Status', spreadsheetStatuses);
  });
