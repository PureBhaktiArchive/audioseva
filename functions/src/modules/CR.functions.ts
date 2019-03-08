import * as functions from 'firebase-functions';
import * as helpers from '../helpers';
import GoogleSheets from '../services/GoogleSheets';
import * as _ from 'lodash';

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
    const sheetNames = await destSpreadsheet.getSheetNames();

    for (const row of await onlineSheet.getRows()) {
      const list = helpers.extractListFromFilename(row['Audio File Name']);

      if (!destinations.has(list)) {
        /// We are not creating new sheets
        if (sheetNames.indexOf(list) < 0) continue;

        const sheet = await destSpreadsheet.useSheet(list);
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
