/*
 * sri sri guru gauranga jayatah
 */

export class SoundEditingWorkflow {
  static getProperty(key) {
    return PropertiesService.getScriptProperties().getProperty(`soundEditing.${key}`);
  }

  static getFolder(key) {
    return DriveApp.getFolderById(SoundEditingWorkflow.getProperty(`${key}FolderId`));
  }

  static get editedFolder() {
    return SoundEditingWorkflow.getFolder('edited');
  }

  static get workspaceRootFolder() {
    return SoundEditingWorkflow.getFolder('workspaceRoot');
  }

  static get spreadsheet() {
    return SpreadsheetApp.openById(SoundEditingWorkflow.getProperty('backendSpreadsheetId'));
  }

  static getTable(sheetName, indexColumnName) {
    return new Sheetfu.Table(
      SoundEditingWorkflow.spreadsheet.getSheetByName(sheetName).getDataRange(),
      indexColumnName
    );
  }

  static get TETasks() {
    return SoundEditingWorkflow.getTable('TE Tasks', 'Task ID');
  }
}
