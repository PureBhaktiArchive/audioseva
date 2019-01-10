const lodash = require('lodash');

/**
 * Extract list from filename supplied as argument
 */
export const extractListFromFilename = (fileName: string): string => {
  return fileName.match(/^[^-]*[^ -]/g)[0];
};

export const taskIdRegex = "^[a-zA-Z]+-\\d+";

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

export const buildSheetIndex = async (sheets, spreadsheetId) => {
  const currentSheets = await sheets.spreadsheets.get({
      spreadsheetId
  });

  const sheetscMetadata = [];
  for (let i = 0; i < currentSheets.data.sheets.length; i++) {
    const { title } = currentSheets.data.sheets[i].properties;
    const { rowCount, columnCount } = currentSheets.data.sheets[i].properties.gridProperties;


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