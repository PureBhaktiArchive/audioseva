const gapi = require('googleapis').google;

export enum GoogleScopes {
  SpreadSheets = 'https://www.googleapis.com/auth/spreadsheets',
}

type ISheetId = string;

// Create other SpreadSheet Interfaces and add to IProjectSpreadSheetNames
// enum IOtherReportSheet {  }

export type IProjectSpreadSheetNames = string;
export type ISheetRowTypes = any;

enum IMajorDimensions {
  Rows = 'ROWS',
  Columns = 'COLUMNS',
}

enum IValueInputOption {
  USER_ENTERED = 'USER_ENTERED',
  RAW = 'RAW',
}

interface IValueRange {
  range: string;
  majorDimension: IMajorDimensions;
  values: IRowValues[];
}

interface IGetSheetResponse {
  headers: any[];
  rows: any[];
}

type IRowValues = string[] | number[];

export default class GoogleSheets {
  protected connection: any;

  protected async connect() {
    if (this.connection) {
      return this.connection;
    }
    const auth = await gapi.auth.getClient({
      scopes: [GoogleScopes.SpreadSheets],
    });
    this.connection = await gapi.sheets({ version: 'v4', auth });
    return this.connection;
  }

  /**
   * Query for a specific google sheets within a spreadsheet
   *
   * @param sheet The sheet to query from google sheets api
   * @param limit How many rows you want including the header titles
   */
  public async getSheet(
    spreadsheetId: ISheetId,
    sheetName: IProjectSpreadSheetNames,
    limit?: number
  ): Promise<IGetSheetResponse> {
    await this.connect();
    const targetSheet: any = await this.connection.spreadsheets.values.get({
      spreadsheetId,
      majorDimension: IMajorDimensions.Rows,
      range: sheetName + this._computeRange(limit),
    });

    const { statusText, status, data, headers } = targetSheet;
    if (statusText !== 'OK' || status !== 200) {
      console.error('Error: Not able to get google sheet');
      return null;
    }
    const { majorDimension, values }: IValueRange = data;
    if (majorDimension !== IMajorDimensions.Rows || !values || !values.length) {
      console.error('Error: Values are wrong format');
      return null;
    }

    const headerKeys: any[] = values.shift();
    return {
      headers: headerKeys,
      rows: this._convertRows(headerKeys, values),
    };
  }

  public async getColumn(
    spreadsheetId: ISheetId,
    sheetName: IProjectSpreadSheetNames,
    columnName: string
  ) {
    await this.connect();

    // Retrieve first row of headers
    const firstRow: any = await this.connection.spreadsheets.values.get({
      spreadsheetId,
      majorDimension: IMajorDimensions.Rows,
      range: `${sheetName}!1:1`,
    });

    const { statusText, status, data } = firstRow;
    if (statusText !== 'OK' || status !== 200) {
      console.error('Error: Not able to get google sheet');
      return null;
    }

    const { values }: IValueRange = data;
    let targetedColumn;
    const headers: any[] = values[0];
    headers.forEach((elem, index) => {
      if (elem === columnName) {
        targetedColumn = this._getNotationLetterFromIndex(index);
      }
    });

    const entireColumn: any = await this.connection.spreadsheets.values.get({
      spreadsheetId,
      majorDimension: IMajorDimensions.Rows,
      range: `${sheetName}!${targetedColumn}:${targetedColumn}`,
    });
    return [].concat.apply([], entireColumn.data.values);
  }

  /**
   * Updates a specific Allotment Sheet row
   *
   * @param sheetId Update row with known row number
   * @param sheetName
   * @param appendValues
   */
  public async updateAllotmentRow(
    sheetId: string,
    sheetName: IProjectSpreadSheetNames,
    rowNumber: number,
    updateValues: any
  ): Promise<any> {
    const targetedRange = `${sheetName}!${rowNumber}:${rowNumber}`;
    // Get our targeted row
    const targetRow: any = await this.connection.spreadsheets.values.get({
      spreadsheetId: sheetId,
      majorDimension: IMajorDimensions.Rows,
      range: targetedRange,
    });

    // Update this row with new merged data from database
    // Object.keys(updateValues).forEach((elem, index) => {
    //   targetRow.data.values[0][index] = targetRow.data.values[0][index];
    // });
    const resource = {
      values: [
        [
          targetRow.data.values[0][0], // "Days passed"
          updateValues.date_given,
          updateValues.notes || '',
          updateValues.language || '',
          updateValues.status,
          targetRow.data.values[0][5], // "File Name"
          updateValues.devotee,
          updateValues.email,
          '', // Phone
          '', // Location
          updateValues.date_done,
          updateValues.follow_up,
          targetRow.data.values[0][12], // "List"
          targetRow.data.values[0][13], // "Serial"
        ],
      ],
    };

    const afterUpdate = await this.connection.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: targetedRange,
      valueInputOption: IValueInputOption.USER_ENTERED,
      resource,
    });

    return afterUpdate;
  }

  /**
   * Add a new row to specified spread sheet
   *
   * @param sheetId The sheet to query from google sheets api
   * @param appendValues Data values to add to Google Sheets
   */
  public async appendRow<T>(
    sheetId: string,
    sheetName: IProjectSpreadSheetNames,
    appendValues: T
  ): Promise<any> {
    await this.connect();

    // https://developers.google.com/sheets/api/guides/values#appending_values
    const appendResponse: any = await this.connection.spreadsheets.values.append(
      {
        spreadsheetId: sheetId,
        range: sheetName,
        valueInputOption: IValueInputOption.USER_ENTERED,
        resource: this._convertAppendFormat(appendValues),
      }
    );

    const { spreadsheetId, updatedRows } = appendResponse.data.updates;
    return { spreadsheetId, updatedRows };
  }

  public async findRowWithColumnValue(
    column: string,
    rowValueToSearch: string | any,
    tableToSearch: any
  ): Promise<any> {
    let found = {};
    let no = 0;
    tableToSearch.forEach((elem, index) => {
      if (elem[column] === rowValueToSearch) {
        found = elem;
        // Add 1 to zero index, and add another 1 for missing header row
        no = index + 2;
      }
    });
    return {
      row: found,
      range: `${no}:${no}`,
    };
  }

  protected _getNotationLetterFromIndex(index: number): string {
    return (
      (index >= 26 ? this._getNotationLetterFromIndex(((index / 26) >> 0) - 1) : '') +
      'abcdefghijklmnopqrstuvwxyz'[index % 26 >> 0].toUpperCase()
    );
  }

  protected _convertRows(headerKeys: any[], rows: any[]): any[] {
    return rows.map((row: any[]) => {
      const obj = {};
      headerKeys.forEach((key: string, i2) => {
        obj[key] = row[i2];
      });
      return obj;
    });
  }

  protected _convertAppendFormat(appendValues: any) {
    const prep = [];
    for (const key of Object.keys(appendValues)) {
      prep.push(appendValues[key]);
    }
    return {
      values: [prep],
    };
  }

  protected _computeRange(limit?: number): string {
    if (!limit) {
      return '';
    }
    return `!A1:${limit + 1}`;
  }

  protected _errorHandler(error: Error) {
    console.error('Something bad happened: ', error);
  }
}
