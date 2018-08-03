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
    return DriveApp.getFolderById(this.uploadsFolderId);
  }

  get incorrectFolder() {
    return DriveUtils.getOrCreateSubfolder(this.uploadsFolder, 'Incorrect');
  }

  get processedFolder() {
    return DriveUtils.getOrCreateSubfolder(this.uploadsFolder, 'Processed');
  }

  get editedFolder() {
    return DriveApp.getFolderById(EDITED_FOLDER_ID);
  }

  /* eslint class-methods-use-this: 0 */
  processUploads() {}
}
