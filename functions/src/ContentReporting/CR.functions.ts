/*!
 * sri sri guru gauranga jayatah
 */

import { config, https } from 'firebase-functions';
import { clusterize } from '../Clustering';
import { DigitalRecordingRow } from '../DigitalRecordingRow';
import { Spreadsheet } from '../Spreadsheet';

export const clusterizeDigitalRecordings = https.onCall(async () => {
  const spreadsheet = await Spreadsheet.open<DigitalRecordingRow>(
    config().cr.digital.spreadsheet.id,
    'Consolidated'
  );
  const rows = await spreadsheet.getRows();
  const clusterKeys = clusterize(rows, 'Date (yyyymmdd)', 'Size Key');
  spreadsheet.updateColumn('Cluster Key', clusterKeys);
});
