/*!
 * sri sri guru gauranga jayatah
 */

import { OnEditEventObject } from '../OnEditEventObject';

const dateColumnsMapping = {
  'Fidelity Checked': 'FC Date',
  'Ready For Archive': 'Finalization Date',
  'Topics Ready': 'Finalization Date',
  'Fidelity Checked without topics': 'FC Date without topics',
};

const baseColumnsMapping = {
  'Topics Ready': 'Ready For Archive',
};

export function onEdit(e: OnEditEventObject) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== 'Fidelity Check') return;

  const header = e.source
    .getActiveSheet()
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0];

  if (e.range.getNumColumns() > 1 || e.range.getRow() === 1) return;

  const changedColumnName = header[e.range.getColumn() - 1];

  const dateColumnName = dateColumnsMapping[changedColumnName];
  if (!dateColumnName) return;
  const dateColumn = header.indexOf(dateColumnName) + 1;
  const dateColumnOffset = dateColumn - e.range.getColumn();

  const baseColumnName = baseColumnsMapping[changedColumnName];
  const baseColumn = baseColumnName ? header.indexOf(baseColumnName) + 1 : null;
  const baseColumnOffset = baseColumn - e.range.getColumn();

  const values = e.range.getValues();

  values.forEach(([value], rowOffset) => {
    const dateRange = e.range.offset(rowOffset, dateColumnOffset, 1, 1);
    if (baseColumn) {
      const baseRange = e.range.offset(rowOffset, baseColumnOffset, 1, 1);
      if (baseRange.isChecked() && value) dateRange.setValue(new Date());
    } else dateRange.setValue(value ? new Date() : null);
  });
}
