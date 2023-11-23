/*!
 * sri sri guru gauranga jayatah
 */

function rowToObject(row: unknown[], columnNames: string[]): unknown {
  return Object.assign(
    {},
    ...columnNames.map((k, i) => ({ [k]: row[i] }))
  ) as unknown;
}

function objectToRow(object: unknown, columnNames: string[]): unknown[] {
  return columnNames.map((columnName) => <unknown>object[columnName]);
}

const standardColumns = [
  'Audio File Name',
  'Fused Lectures',
  'Timing For Fused Lecture',
  'Beginning',
  'Ending',
  'Continuation From',
  'Date',
  'Location',
  'Category',
  'Topics',
  'Gurudeva Timings',
  'Other Speakers',
  'Kirtan',
  'Abrupt Lecture',
  'Suggested Title',
  'Languages',
  'Sound Quality',
  'Sound Issues',
  'Comments',
  'Filled by',
  'Email Address',
  'Timestamp',
  'Updated',
  'Source',
  'Submission Serial',
  'Resolution',
  'Processing Comments',
  'Fidelity Check Resolution',
];

const watchedColumns = [
  'Audio File Name',
  'Beginning',
  'Ending',
  'Continuation From',
  'Resolution',
  'Fidelity Check Resolution',
];

const DEBUG = PropertiesService.getScriptProperties().getProperty('DEBUG');

// this script records changes to the spreadsheet on a "Changelog" sheet.
export function trackChanges(e: GoogleAppsScript.Events.SheetsOnEdit) {
  const timestamp = new Date();
  const sheet = e.range.getSheet();

  if (DEBUG) console.log(`Changes on ${sheet.getName()}: ${JSON.stringify(e)}`);

  const changelogSpreadsheetId =
    PropertiesService.getScriptProperties().getProperty(
      'Changelog.SpreadsheetId'
    ) || e.source.getId();

  const changelogSheetName =
    PropertiesService.getScriptProperties().getProperty(
      'Changelog.SheetName'
    ) || 'Changelog';

  const changelogSheet = SpreadsheetApp.openById(
    changelogSpreadsheetId
  ).getSheetByName(changelogSheetName);

  if (!changelogSheet) return;

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()
    .shift()
    .flatMap((x) => (typeof x === 'string' ? x : null));

  /// skipping sheets not having any of the standard columns
  if (
    headers.filter((header) => standardColumns.includes(header)).length <
    standardColumns.length
  ) {
    return;
  }

  /// Skiping full-row changes (half columns actually)
  if (e.range.getNumColumns() > sheet.getMaxColumns() / 2) {
    if (DEBUG)
      console.log(
        'Skipping full row change',
        e.range.getSheet().getName(),
        e.range.getA1Notation()
      );
    return;
  }

  const massEdit = e.range.getNumRows() > 1 || e.range.getNumColumns() > 1;
  const oldValue = massEdit ? '=NA()' : e.oldValue;

  const editedColumns = headers
    .slice(e.range.getColumn() - 1, e.range.getLastColumn())
    .filter((value) => watchedColumns.includes(value));

  /// skipping changes besides watched columns
  if (editedColumns.length === 0) {
    if (DEBUG)
      console.log(
        'Skipping changes to secondary columns',
        e.range.getSheet().getName(),
        e.range.getA1Notation()
      );
    return;
  }

  for (
    let rowIndex = e.range.getRowIndex();
    rowIndex <= e.range.getLastRow();
    rowIndex++
  ) {
    const [row] = sheet
      .getRange(rowIndex, 1, 1, e.range.getSheet().getLastColumn())
      .getValues();

    const object = rowToObject(row, headers);

    const previousFCR = editedColumns.includes('Fidelity Check Resolution')
      ? oldValue
      : object['Fidelity Check Resolution'];

    /// skipping not resolved rows
    if (!previousFCR) {
      if (DEBUG)
        console.log(
          'Skipping rows without FCR',
          e.range.getSheet().getName(),
          e.range.getA1Notation()
        );
      return;
    }

    const changelogHeaders = changelogSheet
      .getRange(1, 1, 1, changelogSheet.getLastColumn())
      .getValues()
      .shift()
      .flatMap((x) => (typeof x === 'string' ? x : null));

    editedColumns.forEach((columnName) => {
      changelogSheet.appendRow(
        objectToRow(
          {
            Timestamp: timestamp,
            Sheet: sheet.getName(),
            Range: `=HYPERLINK("https://docs.google.com/spreadsheets/d/${e.source.getId()}/edit#gid=${sheet.getSheetId()}&range=${e.range.getA1Notation()}", "${e.range.getA1Notation()}")`,
            'Row Number': `=HYPERLINK("https://docs.google.com/spreadsheets/d/${e.source.getId()}/edit#gid=${sheet.getSheetId()}&range=${rowIndex}:${rowIndex}", ${rowIndex})`,
            'Audio File Name': object['Audio File Name'],
            'FCR (before)': previousFCR,
            Column: columnName,
            'Old Value': oldValue,
            'New Value': object[columnName],
            Checked: false,
          },
          changelogHeaders
        )
      );
    });
  }
}
