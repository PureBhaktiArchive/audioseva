const lodash = require('lodash');

/**
 * Extract list from filename supplied as argument
 */
export const extractListFromFilename = (fileName: string): string => {
  return fileName.match(/^[^-]*[^ -]/g)[0];
};

/**
 * Splits an array into a bunch of arrays
 * GROUPED BY a
 * composite key ( 2nd parameter: values )
 */
export const groupByMulti = (list, values: Array<any>, context: Object): Array<any> => {
  if (!values.length) {
    return list;
  }
  const byFirst = lodash.groupBy(list, values[0], context),
    rest = values.slice(1);
  for (const prop in byFirst) {
    byFirst[prop] = groupByMulti(byFirst[prop], rest, context);
  }
  return byFirst;
};


//////////////////////////////
//
//  Converts a column number into its equivalent A1 notation
//      Example: 3 --> c
//
//////////////////////////////
const columnToLetter = (column) => {
  var temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

export const buildSheetIndex = async (sheets, spreadsheetId) => {
  const currentSheets = await sheets.spreadsheets.get({
      spreadsheetId
  });

  const sheetscMetadata = [];

  for (let i = 0; i < currentSheets.data.sheets.length; i++) {
      let { title } = currentSheets.data.sheets[i].properties;
      let { rowCount, columnCount } = currentSheets.data.sheets[i].properties.gridProperties;


      const result = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${title}!1:1` // get all the cells in the first row `Column headers`
      });

      if (!result.data.values || result.data.values.length === 0) {
          console.log(`No data found in sheet: ${title}`);
          continue;
      }
  
      sheetscMetadata.push({ title, rowCount, columnCount, firstRow: result.data.values[0] });
  }
  return sheetscMetadata;
}


export const getSheetRows = async (currentSheet, sheets, spreadsheetId, columnsIndex) => {
  let remainingRows = parseInt(currentSheet.rowCount);
  let colsEnd = columnToLetter(currentSheet.columnCount); // last column name in A1 notation

  let rows = [];

  let stopAtRow = 0, startAtRow = 2; // start from the second row ( the one after the titles )
  while (remainingRows > 0) {

      // Getting the rows of the sheet in increments of 1000s
      // as this is the MAX num of rowss allowed in one call

      if (remainingRows >= 1000) {
          stopAtRow += 1000;
          remainingRows -= 1000;
      } else {
          stopAtRow += remainingRows
          remainingRows -= stopAtRow;
      }

      const result = await sheets
          .spreadsheets.values.get({
              spreadsheetId,
              range: `${currentSheet.title}!A${startAtRow}:${colsEnd}${stopAtRow}`
          });

      startAtRow += 999;
      rows = rows.concat(result.data.values);
  }

  let rowsAsObjects = [];
  rows.forEach(row => {
      rowsAsObjects.push(rowArraytoObject(columnsIndex, row));
  });

  return rowsAsObjects;
};


const rowArraytoObject = (columnsIndex, rowArray) => {
  let row = {}
  columnsIndex.forEach((column, i) => {
      if (rowArray[i] && rowArray[i] !== '')
          row[column] = rowArray[i];
      else
          row[column] = null;
  });
  return row;
}


// Returns `null` if cell value is `undefined` or contains empty string
// Returns the cell value if both checks is passed
// `null` is important so that the attribute is NOT written into the database
// otherwise, empty string would be written
// or an error rises when the value is `undefined`
export const validateCellValue = (row, columnsIndex, columnTitle) => {
  if (!row[columnsIndex[columnTitle]])
      return null;
  if (row[columnsIndex[columnTitle]] === '')
      return null;
  
  return row[columnsIndex[columnTitle]];
};