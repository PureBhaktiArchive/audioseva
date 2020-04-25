/*
 * sri sri guru gauranga jayatah
 */
import * as functions from 'firebase-functions';
import * as _ from 'lodash';
import { Spreadsheet } from '../Spreadsheet';
import { StorageManager } from '../StorageManager';

export const copySubmissionsToProcessing = functions.pubsub
  .schedule('every day 00:00')
  .timeZone(functions.config().coordinator.timezone)
  .onRun(async () => {
    const onlineSheet = await Spreadsheet.open(
      functions.config().cr.submissions.spreadsheet.id,
      'Online'
    );

    const destinations = new Map();

    for (const row of await onlineSheet.getRows()) {
      const list = StorageManager.extractListFromFilename(row['Audio File Name']);

      if (!destinations.has(list)) {
        const sheet = await Spreadsheet.open(
          functions.config().cr.processing.spreadsheet.id,
          list
        );

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

