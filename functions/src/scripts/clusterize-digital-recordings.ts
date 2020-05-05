/*!
 * sri sri guru gauranga jayatah
 */

import { DisjointSet } from 'dsforest';
import { DigitalRecordingRow } from '../DigitalRecordingRow';
import { Spreadsheet } from '../Spreadsheet';
import _ = require('lodash');

/**
 * Extracts the cluster keys for the rows based on the:
 * - File Name
 * - Date
 * - Size Key
 * Updates the 'Cluster Key' column in the spreadsheet.
 * @param spreadsheetId Id of the Digital Recordings spreadsheet
 */
const clusterizeDigitalRecordings = async (spreadsheetId) => {
  const spreadsheet = await Spreadsheet.open<DigitalRecordingRow>(
    spreadsheetId,
    'Consolidated'
  );

  const rows = await spreadsheet.getRows();
  console.log('Rows are here');

  const equivalence = (a: DigitalRecordingRow, b: DigitalRecordingRow) =>
    a['File Name'] === b['File Name'] ||
    a['File Name'].startsWith(b['File Name']) ||
    b['File Name'].startsWith(a['File Name']) ||
    (!!a['Date (yyyymmdd)'] && a['Date (yyyymmdd)'] === b['Date (yyyymmdd)']) ||
    (!!a['Size Key'] && a['Size Key'] === b['Size Key']);

  const set = new DisjointSet<number>();

  _.forEach(rows, (row, index) => {
    // Adding the current row index as a new set.
    set.makeSet(index);

    // Connecting the current row to the other rows before this one.
    _(rows)
      .take(index)
      .forEach((previousRow, previousIndex) => {
        if (
          !set.areConnected(index, previousIndex) &&
          equivalence(row, previousRow)
        )
          set.union(previousIndex, index);
      });
  });

  console.log(`Found ${set.forestSets} sets`);
  const clusterKeys = rows.map(
    (item, i) =>
      `CK${
        // Adding 2 to match with the row number in the spreadsheet
        (set.findSet(i) + 1 + spreadsheet.frozenRowCount)
          .toString()
          .padStart(Math.log10(rows.length) + 1, '0')
      }`
  );
  console.log(`Calculated cluster keys`);

  await spreadsheet.updateColumn('Cluster Key', clusterKeys);
};

const args = process.argv.slice(2);
console.log('args: ', args);

clusterizeDigitalRecordings(args[0]);
console.log('Called the function');
