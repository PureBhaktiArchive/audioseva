/*
 * sri sri guru gauranga jayatah
 */

export class CRBackend {
  static get spreadsheet() {
    return SpreadsheetApp.openById(
      PropertiesService.getScriptProperties().getProperty('CR.spreadsheetId')
    );
  }

  static get allotmentsTable() {
    return new Sheetfu.Table(
      CRBackend.spreadsheet.getSheetByName('Allotments').getDataRange(),
      'File Name'
    );
  }

  static getLists() {
    return CRBackend.allotmentsTable.items
      .filter(item => item.getFieldValue('Status') === '')
      .map(item => item.getFieldValue('List'))
      .filter((value, index, self) => value !== '' && self.indexOf(value) === index); // Filled and Unique
  }

  static getFiles(list, language, count) {
    return CRBackend.allotmentsTable.items
      .filter(
        item =>
          item.getFieldValue('Status') === '' &&
          item.getFieldValue('List') === list &&
          item.getFieldValue('Language') === language
      )
      .map(item => ({
        filename: item.getFieldValue('File Name'),
        list: item.getFieldValue('List'),
        serial: item.getFieldValue('Serial'),
        notes: item.getFieldValue('Notes'),
        language: item.getFieldValue('Language')
      }))
      .slice(0, count || 20);
  }
}
