/*
 * sri sri guru gauranga jayatah
 */

export class SoundEditingWorkflow {
  static get spreadsheet() {
    return SpreadsheetApp.openById('1ex-_7NHvH3dYK3rN0BARrC9gRrlxugQZirBr2ZXeoz4');
  }

  static getTable(sheetName) {
    return new Sheetfu.Table(
      SoundEditingWorkflow.spreadsheet.getSheetByName(sheetName).getDataRange()
    );
  }

  // https://script.google.com/macros/s/AKfycbyZInNo4Pk8cQebNJ2a9HP-LQiv2vDhq-7q10HQmbyo/dev?path=te/devotees&role=TE
  // https://script.google.com/macros/s/AKfycbyZInNo4Pk8cQebNJ2a9HP-LQiv2vDhq-7q10HQmbyo/dev?path=te/devotees&role=FC
  static getDevotees(parameter) {
    return SoundEditingWorkflow.getTable('Devotees')
      .items.filter(item => item.getFieldValue('Role') === parameter.role)
      .map(item => ({
        emailAddress: item.getFieldValue('Email Address'),
        name: item.getFieldValue('Name'),
        status: item.getFieldValue('Status'),
        uploadsFolderId: item.getFieldValue('Uploads Folder Id')
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // https://script.google.com/macros/s/AKfycbyZInNo4Pk8cQebNJ2a9HP-LQiv2vDhq-7q10HQmbyo/dev?path=te/lists
  static getLists() {
    return SoundEditingWorkflow.getTable('Tasks')
      .items.map(item => item.getFieldValue('Task ID').split('-')[0])
      .filter((value, index, self) => value !== '' && self.indexOf(value) === index) // Filled and Unique
      .sort();
  }

  // https://script.google.com/macros/s/AKfycbyZInNo4Pk8cQebNJ2a9HP-LQiv2vDhq-7q10HQmbyo/dev?path=te/tasks&language=English&list=ML2
  static getTasks(parameter) {
    if (!parameter.list) return [];

    const allottedIds = SoundEditingWorkflow.getTable('Allotments').items.map(item =>
      item.getFieldValue('Task ID')
    );

    return SoundEditingWorkflow.getTable('Tasks')
      .items.filter(
        item =>
          item.getFieldValue('Task ID').startsWith(parameter.list) &&
          (!parameter.language || item.getFieldValue('Language') === parameter.language) &&
          allottedIds.indexOf(item.getFieldValue('Task ID')) === -1
      )
      .map(item => ({
        id: item.getFieldValue('Task ID'),
        definition: item.getFieldValue('Task Definition'),
        action: item.getFieldValue('Action'),
        sourceFiles: [1, 2, 3].map(i => item.getFieldValue(`Source File ${i} Link`)).filter(s => s),
        language: item.getFieldValue('Language')
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, parameter.count || 20);
  }
}
