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
  public metadata: any;
  public headers: any[];
  protected connection: any;

  constructor(spreadsheetId: string, connection, metadata: any) {
    this.spreadsheetId = spreadsheetId;
    this.connection = connection;
    this.metadata = metadata;
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
    return `${this.metadata.properties.title}!${firstColumnLetter ||
      ''}${firstRowNumber || ''}:${lastColumnLetter || ''}${lastRowNumber ||
      ''}`;
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
  protected rowToA1Notation(rowNumber: number): string {
    return this.toA1Notation(null, rowNumber, null, rowNumber);
  }

  /**
   * Converts data row number into the sheet row number.
   * @param dataRowNumber Number of the row in the data section, 1-based
   */
  protected fromDataRowNumber(dataRowNumber: number): number {
    return (
      dataRowNumber +
      Math.min(this.metadata.properties.gridProperties.frozenRowCount, 1)
    );
  }

  /**
   * Gets all the rows on the sheet.
   */
  public async getRows(): Promise<any> {
    await this.getHeaders();
    let rows = [];

    let firstRowNumber = this.fromDataRowNumber(1);
    while (firstRowNumber < this.metadata.properties.gridProperties.rowCount) {
      // Getting the rows of the sheet in increments of 1000s
      // as this is the MAX num of rowss allowed in one call

      const lastRowNumber = Math.min(
        firstRowNumber + 1000,
        this.metadata.properties.gridProperties.rowCount
      );

      const response = await this.connection.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.rowsToA1Notation(firstRowNumber, lastRowNumber),
      });

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
  public async addRows(rows: String[]): Promise<any> {
    if (rows.length === 0) return;

    await this.getHeaders();

    /// Inserting empty rows
    await this.connection.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: {
        requests: rows.map((row, rowIndex) => ({
          insertDimension: {
            range: {
              sheetId: this.metadata.properties.sheetId,
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
    const updateResult = await this.connection.spreadsheets.values.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: {
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

    return updateResult;
  }

  /**
   * Gets the header row. Should be called inside all other methods to ensure the column names to exist.
   */
  protected async getHeaders() {
    if (this.headers && this.headers.length) {
      return;
    }
    const response: any = await this.connection.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      majorDimension: IMajorDimensions.Rows,
      range: this.rowToA1Notation(1),
    });

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
  public async getColumn(columnName: string) {
    await this.getHeaders();
    const columnLetter = this.getColumnLetter(columnName);

    const response = await this.connection.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      majorDimension: IMajorDimensions.Columns,
      range: this.toA1Notation(
        columnLetter,
        this.fromDataRowNumber(1),
        columnLetter,
        null
      ),
    });

    return response.data.values[0];
  }

  /**
   *
   * @param dataRowNumber Number of the row in the data section, 1-based
   */
  public async getRow(dataRowNumber: number): Promise<any> {
    await this.getHeaders();

    const response: any = await this.connection.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      majorDimension: IMajorDimensions.Rows,
      range: this.rowToA1Notation(this.fromDataRowNumber(dataRowNumber)),
    });
    return this.decodeRow(response.data.values[0]);
  }

  /**
   *
   * @param dataRowNumber Number of the row in the data section, 1-based
   * @param row Object to be saved into the row
   */
  public async updateRow(dataRowNumber: number, row: any): Promise<any> {
    await this.getHeaders();
    await this.connection.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: this.rowToA1Notation(this.fromDataRowNumber(dataRowNumber)),
      valueInputOption: IValueInputOption.USER_ENTERED,
      resource: {
        values: [this.encodeRow(row)],
      },
    });
    return true;
  }

  /**
   * Appends a new row to specified spread sheet
   *
   * @param sheetId The sheet to query from google sheets api
   * @param object Data values to add to Google Sheets
   */
  public async appendRow<T>(object: T): Promise<any> {
    await this.getHeaders();

    await this.connection.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: this.metadata.properties.title,
      valueInputOption: IValueInputOption.USER_ENTERED,
      resource: {
        values: [this.encodeRow(object)],
      },
    });

    return true;
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

  protected decodeRow(row: any[]): any {
    return this.headers.reduce(
      (result: any, fieldName: string, index: number) => {
        result[fieldName] =
          row[index] === '' || row[index] === undefined ? null : row[index];
        return result;
      },
      {}
    );
  }

  protected encodeRow(object: any): any[] {
    return this.headers.map((fieldName: string) => object[fieldName] || '');
  }
}
