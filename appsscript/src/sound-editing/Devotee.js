/*
 * sri sri guru gauranga jayatah
 */

import { DriveUtils } from '../DriveUtils';

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

  get role() {
    return this.item.getFieldValue('Role');
  }

  get status() {
    return this.item.getFieldValue('Status');
  }

  get uploadsFolderId() {
    return this.item.getFieldValue('Uploads Folder Id');
  }

  set uploadsFolderId(value) {
    this.item.setFieldValue('Uploads Folder Id', value);
    this.item.commitFieldValue('Uploads Folder Id');
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

  sendEmailToDevotee(subject, text) {
    MailApp.sendEmail(this.emailAddress, subject, text, {
      bcc: 'audioseva@purebhakti.info',
      name: 'AudioSeva Team',
      htmlBody: text
    });
  }

  // Virtual methods

  /* eslint class-methods-use-this: 0 */
  processUploads() {}

  setupWorkspace() {}
}
