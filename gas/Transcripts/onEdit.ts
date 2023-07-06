/*!
 * sri sri guru gauranga jayatah
 */

const autofillDate = (
  changedRange: GoogleAppsScript.Spreadsheet.Range,
  sheetName: string,
  triggerColumnName: string,
  dateColumnName: string
) => {
  const sheet = changedRange.getSheet();
  if (sheet.getName() !== sheetName) return;

  // Ignore header row changes
  if (changedRange.getRow() === 1) return;

  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const triggerColumn = header.indexOf(triggerColumnName) + 1;
  const dateColumn = header.indexOf(dateColumnName) + 1;

  // Skipping if the trigger column is not within edited range
  if (
    changedRange.getColumn() > triggerColumn ||
    changedRange.getLastColumn() < triggerColumn
  )
    return;

  sheet
    .getRange(changedRange.getRow(), dateColumn, changedRange.getNumRows())
    .setValue(new Date());
};

export function onEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  autofillDate(e.range, 'Transcripts', 'Google doc link', 'Date added');
}
