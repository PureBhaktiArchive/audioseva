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
  console.log(`Fetched ${rows.length} rows`);

  const equivalence = (a: DigitalRecordingRow, b: DigitalRecordingRow) =>
    a['File Name'] === b['File Name'] ||
    a['File Name'].startsWith(b['File Name']) ||
    b['File Name'].startsWith(a['File Name']) ||
    (!!a['Date (yyyymmdd)'] && a['Date (yyyymmdd)'] === b['Date (yyyymmdd)']) ||
    (!!a.Size && a.Size === b.Size);

  const set = new DisjointSet<DigitalRecordingRow, number>(
    (r) => r['Serial Number']
  );

  _.forEach(rows, (row, index) => {
    // Adding the current row as a new set.
    set.makeSet(row);

    // Connecting the current row to the other rows before this one.
    _(rows)
      .take(index)
      .forEach((previousRow) => {
        if (
          !set.areConnected(row, previousRow) &&
          equivalence(row, previousRow)
        )
          set.union(previousRow, row);
      });
  });

  console.log(
    `Found ${set.forestSets} clusters among ${set.forestElements} elements`
  );

  const clusterKeys = rows.map(
    (row) =>
      set.setSize(row) > 1
        ? `CK${set.findSet(row)['Serial Number'].toString().padStart(5, '0')}`
        : null // Empty cluster key for singleton rows
  );

  await spreadsheet.updateColumn('Cluster Key', clusterKeys);
};

// First two arguments are node and the script name
const spreadsheetId = process.argv.slice(2).shift();
console.log(`Working with spreadsheet ${spreadsheetId}`);

clusterizeDigitalRecordings(spreadsheetId);
