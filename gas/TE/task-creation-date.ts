/*!
 * sri sri guru gauranga jayatah
 */

export function setDateForCreatedTask(e: GoogleAppsScript.Events.SheetsOnEdit) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== 'Tasks') return;
  if (e.range.getRow() === 1) return;

  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColumn = header.indexOf('Output File Name') + 1;
  const dateColumn = header.indexOf('Date-Task created') + 1;

  // Skipping if the Task ID column is not within edited range
  if (e.range.getColumn() > idColumn || e.range.getLastColumn() < idColumn)
    return;

  sheet
    .getRange(e.range.getRow(), dateColumn, e.range.getNumRows())
    .setValue(new Date());
}
