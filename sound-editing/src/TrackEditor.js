/*
 * sri sri guru gauranga jayatah
 */

import { Devotee } from './Devotee';
import { DriveUtils } from './DriveUtils';

const FLAC_MIME_TYPE = 'audio/flac';
const FILE_NAME_PATTERN = /^(\w+-\d+-\d+)(?:\.|\s*)v(\d+)(?:[.\s]*(.+))?\.\w{3,}$/; // / ML1-030-1.v3 less is more.flac

export class TrackEditor extends Devotee {
  get tasksTable() {
    delete this.tasksTable;
    this.tasksTable = new Sheetfu.Table(
      this.spreadsheet.getSheets()[0].getDataRange(),
      'Output File Name'
    );
    return this.tasksTable;
  }

  processUploads() {
    console.log('Processing uploads for %s.', this.name);
    const files = this.uploadsFolder.searchFiles(`mimeType = '${FLAC_MIME_TYPE}'`);

    while (files.hasNext()) {
      const file = files.next();

      const nameMatch = file.getName().match(FILE_NAME_PATTERN);
      if (!nameMatch) {
        console.warn(
          'File “%s” does not match the naming convention, moving to incorrect.',
          file.getName()
        );
        DriveUtils.moveFile(file, this.incorrectFolder);
        continue;
      }

      const baseName = nameMatch[1];

      const task = this.tasksTable.getItemById(baseName);
      if (!task) {
        console.warn('%s does not match any task, moving to incorrect.', file.getName());
        DriveUtils.moveFile(file, this.incorrectFolder);
        continue;
      }

      task.setFieldValue('Edited File Link', file.getUrl());
      task.commitFieldValue('Edited File Link');

      if (task.getFieldValue('Status') === 'Given') {
        console.log('Setting status of %s to WIP', baseName);
        task.setFieldValue('Status', 'WIP');
        task.commitFieldValue('Status');
      }

      console.log('Copying %s to QC folder and removing from uploads.', file.getName());
      file.makeCopy(this.editedFolder);
      DriveUtils.moveFile(file, this.processedFolder);
    }
  }
}
