/*
 * sri sri guru gauranga jayatah
 */
import { GaxiosResponse } from 'gaxios';
import { google, sheets_v4 } from 'googleapis';
import _ = require('lodash');

enum IValueInputOption {
  USER_ENTERED = 'USER_ENTERED',
  RAW = 'RAW',
}

export class Spreadsheet {
  protected api: sheets_v4.Sheets;
  protected schema: sheets_v4.Schema$Spreadsheet;
  protected sheetIndex: number;
  public columnNames: string[];

  public static async open(spreadsheetId: string, sheetName: string) {
    const auth = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const api = google.sheets({ version: 'v4', auth });
    const schema = this.getResponse(
      await api.spreadsheets.get({
        spreadsheetId: spreadsheetId,
        includeGridData: true,
        ranges: [this.toA1Notation(sheetName, null, 1, null, 1)],
      })
    );
    const sheetIndex = schema.sheets.findIndex(
      s => s.properties.title === sheetName
    );
    if (sheetIndex < 0)
      throw new Error(`No "${sheetName}" sheet in the spreadsheet.`);

    return new Spreadsheet(api, schema, sheetIndex);
  }

  protected constructor(
    api: sheets_v4.Sheets,
    schema: sheets_v4.Schema$Spreadsheet,
    sheetIndex: number
  ) {
    this.api = api;
    this.schema = schema;
    this.sheetIndex = sheetIndex;
    this.columnNames = this.sheet.data[0].rowData[0].values.map(
      cell => cell.effectiveValue.stringValue
    );
  }

  protected static getResponse<T>(response: GaxiosResponse<T>) {
    const { statusText, status, data } = response;
    if (statusText !== 'OK' || status !== 200)
      throw new Error(
        `Got ${status} (${statusText}) from ${response.config.url}.`
      );

    return data;
  }

  /**
   * Constructs an A1 notation of the range. For example: 'Sheet 1'!A3:D5.
   * @param firstColumnLetter First column letter, optional
   * @param firstRowNumber First row number, optional
   * @param lastColumnLetter Last column letter, optional
   * @param lastRowNumber Last row number, optional
   */
  protected static toA1Notation(
    sheetName: string,
    firstColumnLetter: string,
    firstRowNumber: number,
    lastColumnLetter: string,
    lastRowNumber: number
  ) {
    return `${sheetName}!${firstColumnLetter || ''}${firstRowNumber ||
      ''}:${lastColumnLetter || ''}${lastRowNumber || ''}`;
  }

  protected toA1Notation(
    firstColumnLetter: string,
    firstRowNumber: number,
    lastColumnLetter: string,
    lastRowNumber: number
  ) {
    return Spreadsheet.toA1Notation(
      this.title,
      firstColumnLetter,
      firstRowNumber,
      lastColumnLetter,
      lastRowNumber
    );
  }

  /**
   * Returns A1 notation for a row span. For example: 1:5.
   * @param firstRowNumber First row number
   * @param lastRowNumber Last row number
   */
  protected rowsToA1Notation(firstRowNumber: number, lastRowNumber: number) {
    return this.toA1Notation(null, firstRowNumber, null, lastRowNumber);
  }

  /**
   * Returns A1 notation for the row. For example: 1:1.
   * @param rowNumber Row number on the sheet
   */
  protected rowToA1Notation(rowNumber: number) {
    return this.toA1Notation(null, rowNumber, null, rowNumber);
  }

  protected getColumnLetter(columnName: string) {
    let index = this.columnNames.indexOf(columnName);
    if (index < 0) {
      throw Error(`Column ${columnName} not found`);
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    let encoded = '';
    while (index) {
      encoded = alphabet[index % alphabet.length] + encoded;
      index = Math.floor(index / alphabet.length);
    }
    return encoded;
  }

  protected get sheet() {
    return this.schema.sheets[this.sheetIndex];
  }

  /**
   * Converts data row number into the sheet row number.
   * @param dataRowNumber Number of the row in the data section, 1-based
   */
  protected fromDataRowNumber(dataRowNumber: number) {
    return dataRowNumber + Math.min(this.frozenRowCount, 1);
  }

  public get spreadsheetId(): string {
    return this.schema.spreadsheetId;
  }

  /**
   * Returns the title of the sheet
   */
  public get title() {
    return this.sheet.properties.title;
  }

  /**
   * Returns count of the frozen rows in the sheet
   */
  public get frozenRowCount() {
    return this.sheet.properties.gridProperties.frozenRowCount;
  }

  /**
   * Returns count of the total rows in the sheet
   */
  public get rowCount() {
    return this.sheet.properties.gridProperties.rowCount;
  }

  /**
   * Returns the timezone of the spreadsheet
   */
  public get timeZone() {
    return this.schema.properties.timeZone;
  }

  /**
   * Gets values using Google Sheets API
   * @param range range to get values for
   * @param majorDimension Columns or Rows
   */
  protected async getValues(
    range: string,
    majorDimension: 'COLUMNS' | 'ROWS' = 'ROWS'
  ) {
    return (
      Spreadsheet.getResponse(
        await this.api.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          majorDimension,
          dateTimeRenderOption: 'SERIAL_NUMBER',
          valueRenderOption: 'UNFORMATTED_VALUE',
          range,
        })
      ).values || [[]]
    );
  }

  private columnsCache = new Map<string, any[]>();

  /**
   * Gets the entire column data values
   * @param columnName Name of the column to get
   */
  public async getColumn(columnName: string) {
    if (!this.columnsCache.has(columnName)) {
      const columnLetter = this.getColumnLetter(columnName);

      const values = await this.getValues(
        this.toA1Notation(
          columnLetter,
          this.fromDataRowNumber(1),
          columnLetter,
          null
        ),
        'COLUMNS'
      );

      this.columnsCache.set(columnName, values[0]);
    }

    return this.columnsCache.get(columnName);
  }

  /**
   * Finds a row with particular value in specified column
   * @param columnName Name of the column to search in
   * @param value Value of the cell to search for
   * @returns Number of the row in the data section, 1-based. 0 if not found
   */
  public async findDataRowNumber(columnName: string, value: any) {
    const column = await this.getColumn(columnName);
    return column.indexOf(value) + 1;
  }

  /**
   * Transforms the row into an object. @see objectToRow.
   * @param row The row to be transformed into an object
   */
  protected rowToObject<T extends object>(row: any[]) {
    return _.zipObject(
      this.columnNames,
      this.columnNames.map((columnName, index) =>
        row[index] === '' ? null : row[index] === undefined ? null : row[index]
      )
    ) as T;
  }

  /**
   * Transforms the object into a row.
   * `null` in the row and `undefined` in the object are skipped.
   * Empty strings in the rows and `nulls` in the object are standing for the empty cell.
   * @param object Source object to transform into a row
   */
  protected objectToRow<T extends object>(object: T) {
    return this.columnNames.map(columnName =>
      object[columnName] === undefined
        ? null
        : object[columnName] === null
        ? ''
        : object[columnName]
    );
  }

  /**
   * Gets row at specified row number
   * @param dataRowNumber Number of the row in the data section, 1-based
   */
  public async getRow(dataRowNumber: number) {
    const values = await this.getValues(
      this.rowToA1Notation(this.fromDataRowNumber(dataRowNumber))
    );
    return this.rowToObject(values[0]);
  }

  /**
   * Gets all the rows on the sheet.
   */
  public async getRows() {
    const values = await this.getValues(
      this.rowsToA1Notation(this.fromDataRowNumber(1), this.rowCount)
    );

    return values.map(row => this.rowToObject(row));
  }

  /**
   * Updates row at specified row number
   * @param dataRowNumber Number of the row in the data section, 1-based
   * @param object Object to be saved into the row
   * Nulls are skipped. To clear data, use an empty string ("") in the property value.
   */
  public async updateRow<T extends object>(dataRowNumber: number, object: T) {
    Spreadsheet.getResponse(
      await this.api.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: this.rowToA1Notation(this.fromDataRowNumber(dataRowNumber)),
        valueInputOption: IValueInputOption.RAW,
        requestBody: {
          values: [this.objectToRow(object)],
        },
      })
    );
  }

  /**
   * Update rows at specified row numbers.
   * @param objects Map of objects by data row number
   */
  public async updateRows<T extends object>(objects: Map<number, T>) {
    if (objects.size === 0) return;

    Spreadsheet.getResponse(
      await this.api.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: IValueInputOption.RAW,
          data: Array.from(
            objects,
            ([dataRowNumber, object]): sheets_v4.Schema$ValueRange => ({
              range: this.rowToA1Notation(
                this.fromDataRowNumber(dataRowNumber)
              ),
              values: [this.objectToRow(object)],
            })
          ),
        },
      })
    );
  }

  /**
   * Appends new rows
   * @param objects Data values to add to Google Sheets
   */
  public async appendRows<T extends object>(objects: T[]) {
    Spreadsheet.getResponse(
      await this.api.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: this.title,
        valueInputOption: IValueInputOption.RAW,
        requestBody: {
          values: objects.map(object => this.objectToRow(object)),
        },
      })
    );
  }

  /**
   * Updates existing row or appends a new one if not found
   * @param columnName Name of the column to search in
   * @param objects Objects to be saved into the spreadsheet
   */
  public async updateOrAppendRows<T extends object>(
    columnName: string,
    ...objects: T[]
  ) {
    const column = await this.getColumn(columnName);
    const indexedByDataRowNumber = objects.map<[number, T]>(object => [
      column.indexOf(object[columnName]) + 1,
      object,
    ]);

    const [updates, appends] = _.partition(
      indexedByDataRowNumber,
      ([dataRowNumber]) => dataRowNumber > 0
    );

    await Promise.all([
      this.updateRows(new Map<number, T>(updates)),
      this.appendRows(appends.map(([, object]) => object)),
    ]);
  }
}
