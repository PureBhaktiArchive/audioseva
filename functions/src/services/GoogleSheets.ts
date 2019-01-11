const gapi = require('googleapis').google;

export enum GoogleScopes {
  SpreadSheets = 'https://www.googleapis.com/auth/spreadsheets',
}

enum IMajorDimensions {
  Rows = 'ROWS',
  Columns = 'COLUMNS',
}

enum IValueInputOption {
  USER_ENTERED = 'USER_ENTERED',
  RAW = 'RAW',
}

export default class GoogleSheets {
  public spreadsheetId: string;
  public sheetName: string;
  public headers: any[];
  protected connection: any;

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
  public async getRows(limit?: number): Promise<any> {
    await this.connect();
    const targetSheet: any = await this.connection.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      majorDimension: IMajorDimensions.Rows,
      range: this.sheetName + this._computeRange(limit),
    });

    const { statusText, status, data } = targetSheet;
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
    return this._convertRows(values);
  }

  protected async getHeaders() {
    if (this.headers && this.headers.length) {
      return;
    }
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
    this.headers = data.values[0];
  }

  public async getColumn(columnName: string) {
    await this.connect();
    await this.getHeaders();

    let targetedColumn;
    const index = this.headers.indexOf(columnName);
    if (index > -1) {
      targetedColumn = this._getNotationLetterFromIndex(index);
    } else {
      throw Error('Column not found');
    }

    const entireColumn: any = await this.connection.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      majorDimension: IMajorDimensions.Rows,
      range: `${this.sheetName}!${targetedColumn}:${targetedColumn}`,
    });
    return [].concat.apply([], entireColumn.data.values);
  }

  public async getRow(rowNumber: number): Promise<any> {
    await this.connect();
    await this.getHeaders();

    const rowRange = `${this.sheetName}!${rowNumber}:${rowNumber}`;
    const row: any = await this.connection.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      majorDimension: IMajorDimensions.Rows,
      range: rowRange,
    });
    return this._convertRows(row.data.values)[0];
  }

  public async updateRow(rowNumber: number, updateValues: any): Promise<any> {
    await this.connect();
    await this.getHeaders();

    const rowRange = `${this.sheetName}!${rowNumber}:${rowNumber}`;
    const updateRow = this._convertColumnFormat(updateValues);
    const afterUpdate = await this.connection.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: rowRange,
      valueInputOption: IValueInputOption.USER_ENTERED,
      resource: {
        values: [updateRow],
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
  public async appendRow<T>(appendValues: T): Promise<any> {
    await this.connect();
    await this.getHeaders();

    const updateValues = this._convertColumnFormat(appendValues);
    const appendResponse: any = await this.connection.spreadsheets.values.append(
      {
        spreadsheetId: this.spreadsheetId,
        range: this.sheetName,
        valueInputOption: IValueInputOption.USER_ENTERED,
        resource: {
          values: [updateValues],
        },
      }
    );

    const { spreadsheetId, updatedRows } = appendResponse.data.updates;
    return { spreadsheetId, updatedRows };
  }

  protected _getNotationLetterFromIndex(index: number): string {
    return (
      (index >= 26
        ? this._getNotationLetterFromIndex(((index / 26) >> 0) - 1)
        : '') + 'abcdefghijklmnopqrstuvwxyz'[index % 26 >> 0].toUpperCase()
    );
  }

  protected _convertRows(rows: any[]): any[] {
    return rows.map((row: any[]) => {
      const obj = {};
      this.headers.forEach((key: string, i2) => {
        obj[key] = row[i2];
      });
      return obj;
    });
  }

  protected _convertColumnFormat(appendValues: any) {
    return this.headers.map((c: string) => {
      let columnValue = appendValues[c];
      if (columnValue === null || columnValue === undefined) {
        columnValue = '';
      }
      return columnValue;
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
