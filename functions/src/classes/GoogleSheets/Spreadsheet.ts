/*
 * sri sri guru gauranga jayatah
 */
import { google, sheets_v4 } from 'googleapis';
import { Sheet } from './Sheet';

export class Spreadsheet {
  protected api: sheets_v4.Sheets;
  protected schema: sheets_v4.Schema$Spreadsheet;

  public static async open(spreadsheetId: string): Promise<Spreadsheet> {
    const auth = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const api = google.sheets({ version: 'v4', auth });

    const response = await api.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    return new Spreadsheet(api, response.data);
  }

  protected constructor(
    api: sheets_v4.Sheets,
    schema: sheets_v4.Schema$Spreadsheet
  ) {
    this.api = api;
    this.schema = schema;
  }

  public get sheetNames() {
    return this.schema.sheets.map(schema => schema.properties.title);
  }

  public get timeZone() {
    return this.schema.properties.timeZone;
  }

  public async useSheet(title: string) {
    const schema = this.schema.sheets.find(s => s.properties.title === title);
    if (schema === undefined)
      throw new Error(`No "${title}" sheet in the spreadsheet.`);

    return await Sheet.create(this.schema.spreadsheetId, this.api, schema);
  }
}
