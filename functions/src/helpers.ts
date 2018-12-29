// General Helper Functions
export const extractListFromFilename = fileName => {
  return fileName.match(/^[^-]*[^ -]/g)[0];
};


/////////////////////////////////
//
//  Converts time in hh:mm format into number of minutes
//      Example ==> time = 01:30
//                  timeToMins(time) ==> 90
//  
/////////////////////////////////
export const timeToMins = (time) => {
  let hours = time.split(':')[0];
  let mins = time.split(':')[1];
  return (+hours * 60) + (+mins);
}


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

  const sheetTitles = [];
  let columnsIndex = {}; // { ColumnName: columnNumber }

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
  
      // Getting only the sheets that have the required attributes
      const row = result.data.values[0] 
      if (row.indexOf('Beginning') > -1 && row.indexOf('Ending') > -1) {
          //edited
          sheetTitles.push({ title, rowCount, columnCount });
          row.forEach((col, i) => {
              columnsIndex[col.replace(/ /g, '')] = i;
          });
      }
  }
  return { sheetTitles, columnsIndex };
}


export const getSheetRows = async (currentSheet, sheets, spreadsheetId) => {
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
  return rows;
};