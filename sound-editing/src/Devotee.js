/*
 * sri sri guru gauranga jayatah
 */

import { DriveUtils } from './DriveUtils';

const EDITED_FOLDER_ID = '1lCop0H9AQg-6GT-U-blu8zMDHvoP0Sco';

export class Devotee {
  constructor(name, spreadsheetId, uploadsFolderId) {
    this.name = name;
    this.spreadsheetId = spreadsheetId;
    this.uploadsFolderId = uploadsFolderId;
  }

  get spreadsheet() {
    return SpreadsheetApp.openById(this.spreadsheetId);
  }

  get uploadsFolder() {
    delete this.uploadsFolder;
    this.uploadsFolder = DriveApp.getFolderById(this.uploadsFolderId);
    return this.uploadsFolder;
  }

  get incorrectFolder() {
    delete this.incorrectFolder;
    this.incorrectFolder = DriveUtils.getOrCreateSubfolder(this.uploadsFolder, 'Incorrect');
    return this.incorrectFolder;
  }

  get processedFolder() {
    delete this.processedFolder;
    this.processedFolder = DriveUtils.getOrCreateSubfolder(this.uploadsFolder, 'Processed');
    return this.processedFolder;
  }

  get editedFolder() {
    delete this.editedFolder;
    this.editedFolder = DriveApp.getFolderById(EDITED_FOLDER_ID);
    return this.editedFolder;
  }

  static get ids() {
    return {
      backend: {
        spreadsheetId: '1ex-_7NHvH3dYK3rN0BARrC9gRrlxugQZirBr2ZXeoz4',
        sheets: { devotees: 'Devotees' }
      }
    };
  }

  static get devoteesTable() {
    return new Sheetfu.Table(
      SpreadsheetApp.openById(this.ids.backend.spreadsheetId)
        .getSheetByName(this.ids.backend.sheets.devotees)
        .getDataRange(),
      'Email'
    );
  }

  static get all() {
    return this.devoteesTable.items.map(
      item =>
        new Devotee(
          item.getFieldValue('Name'),
          item.getFieldValue('Spreadsheet Id'),
          item.getFieldValue('Uploads Id')
        )
    );
  }
}
