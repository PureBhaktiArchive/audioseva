/*
 * sri sri guru gauranga jayatah
 */
import { sheets_v4 } from 'googleapis';

enum IMajorDimensions {
  Rows = 'ROWS',
  Columns = 'COLUMNS',
}

enum IValueInputOption {
  USER_ENTERED = 'USER_ENTERED',
  RAW = 'RAW',
}

export enum RowUpdateMode {
  Complete,
  Partial,
}

export class Sheet {
  protected spreadsheetId: string;
  protected schema: sheets_v4.Schema$Sheet;
  protected api: sheets_v4.Sheets;
  public headers: string[];

  public static async create(
    spreadsheetId: string,
    api: sheets_v4.Sheets,
    schema: sheets_v4.Schema$Sheet
  ): Promise<Sheet> {
    const sheet = new Sheet(spreadsheetId, api, schema);
    await sheet.fetchHeaders();
    return sheet;
  }

  protected constructor(spreadsheetId: string, api: sheets_v4.Sheets, schema: sheets_v4.Schema$Sheet) {
    this.spreadsheetId = spreadsheetId;
    this.api = api;
    this.schema = schema;
  }

  /**
   * Returns the title of the sheet
   */
  public get title(): string {
    return this.schema.properties.title;
  }

  /**
   * Returns count of the frozen rows in the sheet
   */
  public get frozenRowCount(): number {
    return this.schema.properties.gridProperties.frozenRowCount;
  }

  /**
   * Returns count of the total rows in the sheet
   */
  public get rowCount(): number {
    return this.schema.properties.gridProperties.rowCount;
  }

  /**
   * Constructs an A1 notation of the range. For example: A3:D5.
   * @param firstColumnLetter First column letter, optional
   * @param firstRowNumber First row number, optional
   * @param lastColumnLetter Last column letter, optional
   * @param lastRowNumber Last row number, optional
   */
  protected toA1Notation(
    firstColumnLetter: string,
    firstRowNumber: number,
    lastColumnLetter: string,
    lastRowNumber: number
  ): string {
    return `${this.title}!${firstColumnLetter || ''}${firstRowNumber ||
      ''}:${lastColumnLetter || ''}${lastRowNumber || ''}`;
  }

  /**
   * Returns A1 notation for a row span. For example: 1:5.
   * @param firstRowNumber First row number
   * @param lastRowNumber Last row number
   */
  protected rowsToA1Notation(firstRowNumber: number, lastRowNumber: number): string {
    return this.toA1Notation(null, firstRowNumber, null, lastRowNumber);
  }

  /**
   * Returns A1 notation for the row. For example: 1:1.
   * @param rowNumber Row number on the sheet
   */
  protected rowToA1Notation(rowNumber: number): string {
    return this.toA1Notation(null, rowNumber, null, rowNumber);
  }

  /**
   * Converts data row number into the sheet row number.
   * @param dataRowNumber Number of the row in the data section, 1-based
   */
  protected fromDataRowNumber(dataRowNumber: number): number {
    return dataRowNumber + Math.min(this.frozenRowCount, 1);
  }

  /**
   * Gets values using Google Sheets API
   * @param range range to get values for
   * @param majorDimension Columns or Rows
   */
  protected getValues(range: string, majorDimension: 'COLUMNS' | 'ROWS' = 'ROWS') {
    return this.api.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      majorDimension,
      dateTimeRenderOption: 'SERIAL_NUMBER',
      valueRenderOption: 'UNFORMATTED_VALUE',
      range,
    });
  }

  /**
   * Gets all the rows on the sheet.
   */
  public async getRows<T extends object>(): Promise<T[]> {
    let rows = [];

    let firstRowNumber = this.fromDataRowNumber(1);
    while (firstRowNumber < this.rowCount) {
      // Getting the rows of the sheet in increments of 1000s
      // as this is the MAX num of rows allowed in one call

      const lastRowNumber = Math.min(firstRowNumber + 1000, this.rowCount);

      const response = await this.getValues(this.rowsToA1Notation(firstRowNumber, lastRowNumber));

      const { statusText, status, data } = response;
      if (statusText !== 'OK' || status !== 200) {
        throw new Error('Error: Not able to get google sheet');
      }

      if (!data.values || data.values.length === 0) break;

      rows = rows.concat(data.values.map(row => this.decodeRow(row)));
      firstRowNumber += data.values.length;
    }

    return rows;
  }

  /**
   * Adds a list of data to specific row indices.
   * First it adds empty rows, then it fills these empty rows
   * with the provided list of data.
   * @param rows Spare array of objects, each holds the data
   *  to be written into a specific row
   */
  public async insertRows<T extends object>(rows: T[]): Promise<void> {
    if (rows.length === 0)
      return;

    /// Inserting empty rows
    await this.api.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: rows.map((row, rowIndex) => ({
          insertDimension: {
            range: {
              sheetId: this.schema.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex + 1,
              endIndex: rowIndex + 2,
            },
            inheritFromBefore: false,
          },
        })),
      },
    });

    /// Updating the rows
    await this.api.spreadsheets.values.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        valueInputOption: IValueInputOption.USER_ENTERED,
        data: rows
          .filter(row => row)
          .map((row, rowIndex) => ({
            range: this.toA1Notation(null, rowIndex + 2, null, rowIndex + 2),
            majorDimension: IMajorDimensions.Rows,
            values: [this.encodeRow(row)],
          })),
      },
    });
  }

  protected async fetchHeaders(): Promise<void> {
    if (this.headers && this.headers.length)
      return;

    const response = await this.getValues(this.rowToA1Notation(1));

    const { statusText, status, data } = response;
    if (statusText !== 'OK' || status !== 200) {
      throw new Error('Cannot get the first row of the sheet.');
    }

    if (data.values) this.headers = data.values[0];
  }

  /**
   * Gets the entire column values
   * @param columnName Name of the column to get
   */
  public async getColumn(columnName: string): Promise<any[]> {
    const columnLetter = this.getColumnLetter(columnName);

    const response = await this.getValues(
      this.toA1Notation(columnLetter, this.fromDataRowNumber(1), columnLetter, null),
      'COLUMNS');

    return response.data.values[0];
  }

  /**
   * Finds a row with particular value in specified column
   * @param columnName Name of the column to search in
   * @param value Value of the cell to search for
   * @returns Number of the row in the data section, 1-based. 0 if not found
   */
  public async findRowNumber(columnName: string, value: any): Promise<number> {
    const column = await this.getColumn(columnName);
    return column.indexOf(value) + 1;
  }

  /**
   * Gets row at specified row number
   * @param dataRowNumber Number of the row in the data section, 1-based
   */
  public async getRow<T extends object>(dataRowNumber: number): Promise<T> {
    await this.fetchHeaders();

    const response = await this.getValues(this.rowToA1Notation(this.fromDataRowNumber(dataRowNumber)));
    return this.decodeRow(response.data.values[0]);
  }

  /**
   * Updates row at specified row number
   * @param dataRowNumber Number of the row in the data section, 1-based
   * @param row Object to be saved into the row
   * @param mode Whether to overwrite all columns or only specified
   */
  public async updateRow<T extends object>(dataRowNumber: number, row: T, mode: RowUpdateMode = RowUpdateMode.Complete): Promise<void> {
    await this.fetchHeaders();

    await this.api.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: this.rowToA1Notation(this.fromDataRowNumber(dataRowNumber)),
      valueInputOption: IValueInputOption.USER_ENTERED,
      requestBody: {
        values: [this.encodeRow(
          mode === RowUpdateMode.Complete
            ? row
            : Object.assign(await this.getRow(dataRowNumber), row)
        )],
      },
    });
  }

  /**
   * Updates existing row or appends a new one if not found
   * @param columnName Name of the column to search in
   * @param key Value of the cell to search for
   * @param row Object to be saved into the row
   * @param mode Whehter to merge with existing values or not
   */
  public async updateOrAppendRow<T extends object>(columnName: string, key: any, row: T, mode: RowUpdateMode = RowUpdateMode.Partial): Promise<void> {
    const rowNumber = await this.findRowNumber(columnName, key);
    if (rowNumber)
      await this.updateRow(rowNumber, row, mode);
    else
      await this.appendRow(row);
  }

  /**
   * Appends a new row to specified spread sheet
   * @param sheetId The sheet to query from google sheets api
   * @param object Data values to add to Google Sheets
   */
  public async appendRow<T extends object>(object: T): Promise<void> {
    await this.fetchHeaders();

    await this.api.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: this.title,
      valueInputOption: IValueInputOption.USER_ENTERED,
      requestBody: {
        values: [this.encodeRow(object)],
      },
    });
  }

  protected getColumnLetter(columnName: string): string {
    let index = this.headers.indexOf(columnName);
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

  protected decodeRow<T extends object>(row: any[]): T {
    return this.headers.reduce(
      (result: any, fieldName: string, index: number) => {
        result[fieldName] =
          row[index] === '' || row[index] === undefined ? null : row[index];
        return result;
      },
      {}
    );
  }

  protected encodeRow<T extends object>(object: T): any[] {
    return this.headers.map((fieldName: string) => object[fieldName] || '');
  }
}
