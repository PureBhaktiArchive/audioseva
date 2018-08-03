/*
 * sri sri guru gauranga jayatah
 */

import { TrackEditor } from './TrackEditor';
import { Devotee } from './Devotee';

export class DevoteeRepository {
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
    return this.devoteesTable.items.map(item => {
      switch (item.getFieldValue('Role')) {
        case 'TE':
          return new TrackEditor(
            item.getFieldValue('Name'),
            item.getFieldValue('Spreadsheet Id'),
            item.getFieldValue('Uploads Id')
          );

        default:
          return new Devotee(
            item.getFieldValue('Name'),
            item.getFieldValue('Spreadsheet Id'),
            item.getFieldValue('Uploads Id')
          );
      }
    });
  }
}
