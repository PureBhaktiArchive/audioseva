const gapi = require('googleapis').google;
import Sheet from './Sheet';

export enum GoogleScopes {
  SpreadSheets = 'https://www.googleapis.com/auth/spreadsheets',
}

export default class GoogleSheets {
  public spreadsheetId: string;
  protected connection: any;

  constructor(spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId;
  }

  async useSheet(sheetName: string) {
    await this.connect();
    return new Sheet(this.spreadsheetId, this.connection, sheetName);
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
   * Creates a new empty sheet with the specified title
   * @param title the title of the new sheet
   */
  public async createSheet(title: String): Promise<any> {
    if (!this.connection) await this.connect();
    const creatingResult = await this.connection.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: {
        requests: [{ addSheet: { properties: { title } } }],
      },
    });
    return creatingResult;
  }

  public async getSheetNames() {
    if (!this.connection) await this.connect();
    const sheetsMetadata: any = await this.connection.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });
    return sheetsMetadata.data.sheets.map(sheet => sheet.properties.title);
  }
}
