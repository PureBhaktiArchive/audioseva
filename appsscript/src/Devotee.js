/*
 * sri sri guru gauranga jayatah
 */

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

  get status() {
    return this.item.getFieldValue('Status');
  }

  get location() {
    return this.item.getFieldValue('Location');
  }

  get languages() {
    return this.item
      .getFieldValue('Languages')
      .split(',')
      .map(language => language.trim());
  }

  static get devoteesTable() {
    return new Sheetfu.Table(
      SpreadsheetApp.openById(
        PropertiesService.getScriptProperties().getProperty('registrations.spreadsheetId')
      )
        .getSheetByName('Registrations')
        .getDataRange()
    );
  }

  static getByRole(role) {
    return this.devoteesTable
      .select({ [role]: 'Yes' })
      .filter(
        item =>
          ['Lost', 'Opted out', 'Incorrect', 'Duplicate'].indexOf(item.getFieldValue('Status')) ===
          -1
      )
      .map(item => new Devotee(item));
  }
}
