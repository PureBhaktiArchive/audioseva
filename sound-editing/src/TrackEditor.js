/*
 * sri sri guru gauranga jayatah
 */

import { Devotee } from './Devotee';
import { DriveUtils } from './DriveUtils';

const FLAC_MIME_TYPE = 'audio/flac';

export class TrackEditor extends Devotee {
  get tasksTable() {
    return new Sheetfu.Table(this.spreadsheet.getSheets()[0].getDataRange(), 'Output File Name');
  }

  processUploads() {
    console.log('Processing uploads for %s.', this.name);
    const files = this.uploadsFolder.searchFiles(`mimeType = '${FLAC_MIME_TYPE}'`);

    while (files.hasNext()) {
      const file = files.next();

      const taskId = file.getName().replace(/\.flac$/, '');

      // Finding corresponding task
      const task = this.tasksTable.getItemById(taskId);
      if (task) {
        switch (task.getFieldValue('Status')) {
          case 'Done':
            MailApp.sendEmail(
              file.getOwner().getEmail(),
              `File “${taskId}” is already Done`,
              `This file is already processed and marked as Done. You cannot upload a new version.`
            );
            break;

          default:
            DriveUtils.removeAllFiles(this.editedFolder, file.getName());

            // Making a copy and saving the file for further processing
            console.log('Copying %s into Edited folder.', file.getName());
            const copiedFile = file.makeCopy(this.editedFolder);

            // Saving file link
            task.setFieldValue('Edited File Link', copiedFile.getUrl());
            task.commitFieldValue('Edited File Link');

            task.setFieldValue('Status', 'WIP');
            task.commitFieldValue('Status');
            break;
        }
      }

      if (!task) {
        console.warn('File “%s” does not match any task.', file.getName());
        MailApp.sendEmail(
          file.getOwner().getEmail(),
          `Task “${taskId}” is not found in your TE Doc`,
          `You have uploaded “${file.getName()}” file recently, but there is no corresponding task in your TE Doc. Please recheck the file name and upload again.`
        );
        // Drive.Comments.insert({ content: 'Task is not found in your TE Doc.' }, file.getId());
        continue;
      }

      this.processedFolder.addFile(file);
      this.uploadsFolder.removeFile(file);
    }
  }
}
