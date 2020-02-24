function rowToObject(row: any[], columnNames: string[]): object {
  return Object.assign({}, ...columnNames.map((k, i) => ({ [k]: row[i] })));
}

const changelogSheetName = "Changelog";

const standardColumns = [
  "Audio File Name",
  "Fused Lectures",
  "Timing For Fused Lecture",
  "Beginning",
  "Ending",
  "Continuation From",
  "Date",
  "Location",
  "Category",
  "Topics",
  "Gurudeva Timings",
  "Other Speakers",
  "Kirtan",
  "Abrupt Lecture",
  "Suggested Title",
  "Languages",
  "Sound Quality",
  "Sound Issues",
  "Comments",
  "Filled by",
  "Email Address",
  "Timestamp",
  "Updated",
  "Source",
  "Submission Serial",
  "Resolution",
  "Processing Comments",
  "Fidelity Check Resolution"
];

const watchedColumns = [
  "Audio File Name",
  "Beginning",
  "Ending",
  "Continuation From",
  "Resolution",
  "Fidelity Check Resolution"
];

interface OnEditEventObject {
  authMode: GoogleAppsScript.Script.AuthMode;
  oldValue: any;
  range: GoogleAppsScript.Spreadsheet.Range;
  source: GoogleAppsScript.Spreadsheet.Spreadsheet;
  triggerUid: string;
  user: GoogleAppsScript.Base.User;
  value: any;
}

// this script records changes to the spreadsheet on a "Changelog" sheet.
function onEdit(e: OnEditEventObject) {
  const timestamp = new Date();
  const sheet = e.range.getSheet();

  /// skipping chages to the Changelog sheet itself
  if (sheet.getName() === changelogSheetName) {
    return;
  }

  const changelogSheet = e.source.getSheetByName(changelogSheetName);
  if (!changelogSheet) {
    return;
  }

  const headers: string[] = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()
    .shift();

  /// skipping sheets not having any of the standard columns
  if (
    headers.filter(header => standardColumns.includes(header)).length <
    standardColumns.length
  ) {
    return;
  }

  const massEdit = e.range.getNumRows() > 1 || e.range.getNumColumns() > 1;
  const oldValue = massEdit ? "=NA()" : e.oldValue;

  const editedColumns = headers
    .slice(e.range.getColumn() - 1, e.range.getLastColumn())
    .filter(value => watchedColumns.includes(value));

  /// skipping changes besides watched columns
  if (editedColumns.length === 0) {
    return;
  }

  const rows = e.range
    .offset(
      0,
      -e.range.getColumn() + 1,
      e.range.getNumRows(),
      e.range.getSheet().getLastColumn()
    )
    .getValues();

  rows.forEach((row, index) => {
    const object = rowToObject(row, headers);

    const previousFCR = editedColumns.includes("Fidelity Check Resolution")
      ? oldValue
      : object["Fidelity Check Resolution"];

    /// skipping not resolved rows
    if (!previousFCR) {
      return;
    }

    editedColumns.forEach(columnName => {
      changelogSheet.appendRow([
        timestamp,
        sheet.getName(),
        e.range.getRowIndex() + index,
        object["Audio File Name"],
        previousFCR,
        columnName,
        oldValue,
        object[columnName]
      ]);
    });
  });
}
