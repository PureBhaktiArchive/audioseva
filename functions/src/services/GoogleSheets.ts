const gapi = require('googleapis').google;

export enum GoogleScopes {
  SpreadSheets = 'https://www.googleapis.com/auth/spreadsheets',
}

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

interface IGetSheetResponse {
  headers: any[];
  rows: any[];
}

export default class GoogleSheets {
  protected spreadsheetId: string;
  protected sheetName: string;
  protected connection: any;
  protected headers: any[];

  constructor(spreadsheetId: string, sheetName: string) {
    this.spreadsheetId = spreadsheetId;
    this.sheetName = sheetName;
  }

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
    limit?: number
  ): Promise<IGetSheetResponse> {
    await this.connect();
    const targetSheet: any = await this.connection.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      majorDimension: IMajorDimensions.Rows,
      range: this.sheetName + this._computeRange(limit),
    });

    const { statusText, status, data, headers } = targetSheet;
    if (statusText !== 'OK' || status !== 200) {
      console.error('Error: Not able to get google sheet');
      return null;
    }
    const { majorDimension, values } = data;
    if (majorDimension !== IMajorDimensions.Rows || !values || !values.length) {
      console.error('Error: Values are wrong format');
      return null;
    }

    this.headers = values.shift();
    return {
      headers: this.headers,
      rows: this._convertRows(this.headers, values),
    };
  }

  public async getColumn(
    columnName: string
  ) {
    await this.connect();

    // Retrieve first row of headers
    const firstRow: any = await this.connection.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      majorDimension: IMajorDimensions.Rows,
      range: `${this.sheetName}!1:1`,
    });

    const { statusText, status, data } = firstRow;
    if (statusText !== 'OK' || status !== 200) {
      console.error('Error: Not able to get google sheet');
      return null;
    }

    const { values } = data;
    let targetedColumn;
    this.headers = values[0];
    const index = this.headers.indexOf(columnName);
    if (index > -1) {
      targetedColumn = this._getNotationLetterFromIndex(index);
    } else {
      throw Error("Column not found");
    }

    const entireColumn: any = await this.connection.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      majorDimension: IMajorDimensions.Rows,
      range: `${this.sheetName}!${targetedColumn}:${targetedColumn}`,
    });
    return [].concat.apply([], entireColumn.data.values);
  }

  public async updateRow(
    rowNumber: number,
    updateValues: any
  ): Promise<any> {
    this.connect();
    const targetedRange = `${this.sheetName}!${rowNumber}:${rowNumber}`;
    const updateRow = this._convertColumnFormat(updateValues);
    const afterUpdate = await this.connection.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: targetedRange,
      valueInputOption: IValueInputOption.USER_ENTERED,
      resource: {
        values: [ updateRow ],
      },
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
    appendValues: T
  ): Promise<any> {
    await this.connect();
    const appendResponse: any = await this.connection.spreadsheets.values.append(
      {
        spreadsheetId: this.spreadsheetId,
        range: this.sheetName,
        valueInputOption: IValueInputOption.USER_ENTERED,
        resource: this._convertColumnFormat(appendValues),
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

  protected _convertColumnFormat(appendValues: any) {
    return this.headers.map((c: string) => {
      let columnValue = appendValues[c];
      if (columnValue === null || columnValue === undefined) {
        columnValue = "";
      }
    });
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
