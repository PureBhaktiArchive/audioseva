/*
 * sri sri guru gauranga jayatah
 */

import { DriveUtils } from './DriveUtils';

const EDITED_FOLDER_ID = '1lCop0H9AQg-6GT-U-blu8zMDHvoP0Sco';

export class Devotee {
  constructor(item) {
    this.item = item;
  }

  get name() {
    return this.item.getFieldValue('Name');
  }

  get emailAddress() {
    return this.item.getFieldValue('Email Address');
  }

  get spreadsheetId() {
    return this.item.getFieldValue('Spreadsheet Id');
  }

  get uploadsFolderId() {
    return this.item.getFieldValue('Uploads Folder Id');
  }

  set spreadsheetId(value) {
    this.item.setFieldValue('Spreadsheet Id', value);
    this.item.commitFieldValue('Spreadsheet Id');
  }

  set uploadsFolderId(value) {
    this.item.setFieldValue('Uploads Folder Id', value);
    this.item.commitFieldValue('Uploads Folder Id');
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

  sendEmailToDevotee(subject, text) {
    MailApp.sendEmail(this.emailAddress, subject, text, {
      bcc: 'audioseva@purebhakti.info',
      name: 'AudioSeva Team',
      htmlBody: text
    });
  }
}
