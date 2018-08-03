/*
 * sri sri guru gauranga jayatah
 */

import { Devotee } from './Devotee';

const FLAC_MIME_TYPE = 'audio/flac';
const FILE_NAME_PATTERN = /^(\w+-\d+-\d+)\.flac$/; // ML1-030-1.flac

export class TrackEditor extends Devotee {
  get tasksTable() {
    return new Sheetfu.Table(this.spreadsheet.getSheets()[0].getDataRange(), 'Output File Name');
  }

  processUploads() {
    console.log('Processing uploads for %s.', this.name);
    const files = this.uploadsFolder.searchFiles(`mimeType = '${FLAC_MIME_TYPE}'`);

    while (files.hasNext()) {
      const file = files.next();

      // Checking file name pattern
      const nameMatch = file.getName().match(FILE_NAME_PATTERN);
      if (!nameMatch) {
        console.warn('File “%s” does not match the naming convention.', file.getName());
        Drive.Comments.insert(
          { content: 'File does not match the naming convention.' },
          file.getId()
        );

        this.processedFolder.addFile(file);
        this.uploadsFolder.removeFile(file);
        continue;
      }

      const baseName = nameMatch[1];

      // Finding corresponding task
      const task = this.tasksTable.getItemById(baseName);
      if (!task) {
        console.warn('File “%s” does not match any task, moving to incorrect.', file.getName());
        Drive.Comments.insert({ content: 'Task is not found in your TE Doc.' }, file.getId());
        this.processedFolder.addFile(file);
        this.uploadsFolder.removeFile(file);
        continue;
      }

      // Checking that the file was not uploaded earlier
      // TODO

      // Making a copy and saving the file for further processing
      console.log('Copying %s into Edited folder.', file.getName());
      const copiedFile = file.makeCopy(this.editedFolder);

      this.processedFolder.addFile(file);
      this.uploadsFolder.removeFile(file);

      // Saving file link
      task.setFieldValue('Edited File Link', copiedFile.getUrl());
      task.commitFieldValue('Edited File Link');

      // Setting task status
      if (task.getFieldValue('Status') === 'Given') {
        console.log('Setting status of %s to WIP', baseName);
        task.setFieldValue('Status', 'WIP');
        task.commitFieldValue('Status');
      }
    }
  }
}
