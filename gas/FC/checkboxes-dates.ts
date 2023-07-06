/*!
 * sri sri guru gauranga jayatah
 */

const dateColumnsMapping = {
  'Fidelity Checked': 'FC Date',
  'Ready For Archive': 'Finalization Date',
  'Topics Ready': 'Finalization Date',
  'Fidelity Checked without topics': 'FC Date without topics',
};

const baseColumnsMapping = {
  'Topics Ready': 'Ready For Archive',
};

export function setDatesForCheckboxes(e: GoogleAppsScript.Events.SheetsOnEdit) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Fidelity Check') return;

  console.log('Changes detected', {
    range: e.range.getA1Notation(),
    value: e.range.getValue(),
  });

  // Ignore header row changes
  if (e.range.getRow() === 1) return;

  if (e.range.getNumColumns() > 1 || e.range.getNumRows() > 1) {
    console.warn(
      'Multi-column and -row edits are ignored',
      e.range.getA1Notation()
    );
    return;
  }

  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const changedColumnName = header[e.range.getColumn() - 1];

  const dateColumnName = dateColumnsMapping[changedColumnName];

  // Ignore irrelevant column changes
  if (!dateColumnName) {
    console.log('Irrelevant column "%s" was changed', changedColumnName);
    return;
  }

  const dateColumn = header.indexOf(dateColumnName) + 1;
  const dateColumnOffset = dateColumn - e.range.getColumn();

  const baseColumnName = baseColumnsMapping[changedColumnName];
  const baseColumn = baseColumnName ? header.indexOf(baseColumnName) + 1 : null;
  const baseColumnOffset = baseColumn - e.range.getColumn();

  const values = e.range.getValues();

  values.forEach(([value], rowOffset) => {
    const dateRange = e.range.offset(rowOffset, dateColumnOffset, 1, 1);
    if (baseColumn) {
      // Updating the Finalization Date if the row is Ready For Archive and Topics Ready changed
      const baseRange = e.range.offset(rowOffset, baseColumnOffset, 1, 1);
      if (baseRange.isChecked() && value) dateRange.setValue(new Date());
    } else dateRange.setValue(value ? new Date() : null);
  });
}
