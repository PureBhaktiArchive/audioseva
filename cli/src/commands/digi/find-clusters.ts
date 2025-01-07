/*!
 * sri sri guru gauranga jayatah
 */

import { DisjointSet } from 'dsforest';
import _ from 'lodash';
import ora from 'ora';
import { Argv } from 'yargs';
import { DigitalRecordingRow } from '../../DigitalRecordingRow';
import { Spreadsheet } from '../../Spreadsheet';

export const desc = `Find clusters in the DIGI rows based on the:
  - File Name
  - Date
  - Size Key
  Update the 'Cluster Key' column in the spreadsheet.`;

export const builder = (yargs: Argv): Argv =>
  yargs.options({
    spreadsheetId: {
      alias: 's',
      describe: 'Digital Recordings spreadsheet id',
      demandOption: true,
    },
  });

interface Arguments {
  spreadsheetId: string;
}

export const handler = async ({ spreadsheetId }: Arguments): Promise<void> => {
  const spinner = ora();

  spinner.start('Fetching rows');
  const spreadsheet = await Spreadsheet.open<DigitalRecordingRow>(
    spreadsheetId,
    'Consolidated'
  );
  const rows = await spreadsheet.getRows();
  spinner.succeed(`Fetched ${rows.length} rows`);

  const equivalence = (a: DigitalRecordingRow, b: DigitalRecordingRow) =>
    a['File Name'] === b['File Name'] ||
    a['File Name'].startsWith(b['File Name']) ||
    b['File Name'].startsWith(a['File Name']) ||
    (!!a['Date (yyyymmdd)'] && a['Date (yyyymmdd)'] === b['Date (yyyymmdd)']) ||
    (!!a.Size && a.Size === b.Size);

  const set = new DisjointSet<DigitalRecordingRow, number>(
    (r) => r['Serial Number']
  );

  spinner.start('Finding clusters');
  _.forEach(rows, (row, index) => {
    // Ignoring dates after 2010
    if (row.Year > 2010) return;

    // Adding the current row as a new set.
    set.makeSet(row);

    // Connecting the current row to the other rows before this one.
    _(rows)
      .take(index)
      .forEach((previousRow) => {
        if (
          set.includes(previousRow) &&
          !set.areConnected(row, previousRow) &&
          equivalence(row, previousRow)
        )
          set.union(previousRow, row);
      });
  });

  spinner.succeed(
    `Found ${set.forestSets} clusters among ${set.forestElements} elements`
  );

  spinner.start('Updating spreadsheet');
  const clusterKeys = rows.map(
    (row) =>
      set.setSize(row) > 1
        ? `CK${set.findSet(row)?.['Serial Number'].toString().padStart(5, '0')}`
        : null // Empty cluster key for singleton rows
  );

  await spreadsheet.updateColumn('Cluster Key', clusterKeys);
  spinner.succeed();
};
