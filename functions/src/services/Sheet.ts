enum IMajorDimensions {
  Rows = 'ROWS',
  Columns = 'COLUMNS',
}

enum IValueInputOption {
  USER_ENTERED = 'USER_ENTERED',
  RAW = 'RAW',
}

export default class Sheet {
  public spreadsheetId: string;
  public sheetName: string;
  public sheetMetadata: any;
  public headers: any[];
  protected connection: any;

  constructor(spreadsheetId: string, connection, sheetName: string) {
    this.spreadsheetId = spreadsheetId;
    this.connection = connection;
    this.sheetName = sheetName;
  }

  /**
   * Query for a specific google sheets within a spreadsheet
   *
   * @param start The row to start reading from
   * @param limit How many rows you want including the header titles
   */
  protected async _getRowsByStart(start: number, limit?: number): Promise<any> {
    const targetSheet: any = await this.connection.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      majorDimension: IMajorDimensions.Rows,
      range: this.sheetName + this._computeRangeByStart(start, limit),
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

    if (start === 1) values.shift();
    return this._convertRows(values);
  }

  public async getRows(): Promise<any> {
    await this.getHeaders();
    let rows = [];
    let remainingRows = this.sheetMetadata.rowCount;

    let stopAtRow = 0,
      startAtRow = 1;
    while (remainingRows > 0) {
      // Getting the rows of the sheet in increments of 1000s
      // as this is the MAX num of rowss allowed in one call

      if (remainingRows >= 1000) {
        stopAtRow += 1000;
        remainingRows -= 1000;
      } else {
        stopAtRow += remainingRows;
        remainingRows -= stopAtRow;
      }
      const result = await this._getRowsByStart(startAtRow, stopAtRow);

      startAtRow += 1000;

      rows = rows.concat(result);
    }

    return rows;
  }

  /**
   * Adds a list of data to specific row indices.
   * First it adds empty rows, then it fills these empty rows
   * with the provided list of data.
   * @param rows Array of objects, each holds the data
   *  to be written into a specific row
   * @param ranges Array of row indices, where the data should be placed
   */
  public async addRows(rows: String[]): Promise<any> {
    if (rows.length === 0) return;

    await this.getHeaders();

    await this.connection.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: {
        requests: rows
          .map((row, rowIndex) => {
            return {
              insertDimension: {
                range: {
                  sheetId: this.sheetMetadata.sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex + 1,
                  endIndex: rowIndex + 2,
                },
                inheritFromBefore: false,
              },
            };
          })
          .filter(row => row),
      },
    });

    const updateResult = await this.connection.spreadsheets.values.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: {
        valueInputOption: IValueInputOption.USER_ENTERED,
        data: rows
          .map((row, rowIndex) => {
            if (!row) return null;
            const rowAsArray = this._convertColumnFormat(row);
            const lastColumnNotation = this._getNotationLetterFromIndex(
              rowAsArray.length - 1
            );
            return {
              range: `${this.sheetName}!A${rowIndex +
                2}:${lastColumnNotation}${rowIndex + 2}`,
              majorDimension: IMajorDimensions.Rows,
              values: [rowAsArray],
            };
          })
          .filter(row => row),
      },
    });

    return updateResult;
  }

  public async getHeaders() {
    if (this.headers && this.headers.length) {
      return;
    }
    const firstRow: any = await this.connection.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      majorDimension: IMajorDimensions.Rows,
      range: `${this.sheetName}!1:1`,
    });

    const sheetsMetadata: any = await this.connection.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });

    const sheetMetadata = sheetsMetadata.data.sheets.filter(
      sheet => sheet.properties.title === this.sheetName
    )[0];

    const { sheetId } = sheetMetadata.properties;
    const { rowCount, columnCount } = sheetMetadata.properties.gridProperties;

    const { statusText, status, data } = firstRow;
    if (statusText !== 'OK' || status !== 200) {
      console.error('Error: Not able to get google sheet');
      return null;
    }

    if (data.values)
      // `undefined` when a brand new sheet has just been created
      this.headers = data.values[0];
    this.sheetMetadata = { sheetId, rowCount, columnCount };
  }

  public async getColumn(columnName: string) {
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

    // Remove column header name
    entireColumn.data.values.shift();

    return [].concat.apply([], entireColumn.data.values);
  }

  public async getRow(rowNumber: number): Promise<any> {
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
   * @param isArray optional: set to true when appendValues is an array not an object
   */
  public async appendRow<T>(appendValues: T, isArray?: boolean): Promise<any> {
    await this.getHeaders();

    const updateValues = isArray
      ? appendValues
      : this._convertColumnFormat(appendValues);

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
        obj[key] = row[i2] === '' || row[i2] === undefined ? null : row[i2];
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

  protected _computeRangeByStart(start?: number, limit?: number): string {
    if (!limit) {
      return '';
    }
    return `!A${start}:${limit}`;
  }

  protected _errorHandler(error: Error) {
    console.error('Something bad happened: ', error);
  }
}
