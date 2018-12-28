const gapi = require('googleapis').google;

export enum GoogleScopes {
  SpreadSheets = 'https://www.googleapis.com/auth/spreadsheets',
}

const letters: string[] = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'X',
  'Y',
  'Z',
];

type ISheetId = string;

export enum ISoundQualityReportSheet {
  Allotments = 'Allotments',
  Submissions = 'Submissions',
  Statistics = 'Statistics',
}

// Create other SpreadSheet Interfaces and add to IProjectSpreadSheetNames
// enum IOtherReportSheet {  }

export type IProjectSpreadSheetNames = ISoundQualityReportSheet | string;

/**
 * The keys here represent the column keys in Google Sheets, days_passed = "Days passed"
 * As long as the order is preserved, the cells will be updated correctly, the spelling
 * of the keys and headers are unimportant to Google Sheets API
 */
export interface IAllotmentRow {
  // some of these should ideally be enums
  days_passed: string;
  date_given: string;
  notes: string;
  language: string;
  status: string;
  file_name: string;
  devotee: string;
  email: string;
  phone: string;
  location: string;
  date_done: string;
  follow_up: string;
  list: string;
  serial: number;
}

export interface ISubmissionRow {
  // some of these should ideally be enums
  completed: string;
  updated: string;
  submission_serial: number;
  update_link: string;
  audio_file_name: string;
  unwanted_parts: string;
  sound_issues: string;
  sound_quality_rating: string;
  beginning: string;
  ending: string;
  comments: string;
  name: string;
  email_address: string;
}

export type ISheetRowTypes = IAllotmentRow | ISubmissionRow;

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

abstract class SpreadSheet {
  protected abstract connect(): any;
  public abstract getSheet(
    spreadsheetId: ISheetId,
    sheetName: IProjectSpreadSheetNames,
    limit?: number
  ): Promise<IGetSheetResponse>;
  public abstract appendRow(
    spreadsheetId: ISheetId,
    sheetName: IProjectSpreadSheetNames,
    appendValues: any
  ): Promise<any>;
  public abstract getColumn(
    spreadsheetId: ISheetId,
    sheetName: IProjectSpreadSheetNames,
    columnName: string
  ): Promise<any>;
  public abstract findRowWithColumnValue(
    column: string,
    rowValueToSearch: string | any,
    tableToSearch: any
  ): Promise<any>;
}

type IRowValues = string[] | number[];

export default class GoogleSheets extends SpreadSheet {
  protected connection: any;

  protected async connect() {
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
    // console.log("Range query: ", sheet + this._computeRange(limit));
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
      range: sheetName + '!A1:Z1',
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
        targetedColumn = letters[index];
      }
    });

    // console.log("Column letter of File Name: ", targetedColumn);

    const entireColumn: any = await this.connection.spreadsheets.values.get({
      spreadsheetId,
      majorDimension: IMajorDimensions.Rows,
      range: sheetName + `!${targetedColumn}1:${targetedColumn}`,
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
    const targetedRange = sheetName + `!A${rowNumber}:Z${rowNumber}`;
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

    // console.log("Merged updated row: ", resource);
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
  public async appendRow(
    sheetId: string,
    sheetName: IProjectSpreadSheetNames,
    appendValues: ISheetRowTypes
  ): Promise<any> {
    await this.connect();
    // console.log("rows to append: ", this._convertAppendFormat(appendValues));

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
        no = index;
      }
    });
    return {
      row: found,
      range: `A${no + 2}:N`,
    };
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
