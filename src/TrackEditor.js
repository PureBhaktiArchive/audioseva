/*
 * sri sri guru gauranga jayatah
 */

import { Devotee } from './Devotee';
import { DriveUtils } from './DriveUtils';

const FLAC_MIME_TYPE = 'audio/flac';

const COLUMNS = {
  DateGiven: 'Date Given',
  Status: 'Status',
  OutputFileName: 'Output File Name',
  TaskDefinition: 'Task Definition',
  SourceFileLink1: 'Source File 1 Link',
  SourceFileLink2: 'Source File 2 Link',
  SourceFileLink3: 'Source File 3 Link',
  EditedFileLink: 'Edited File Link',
  SoundQualityRating: 'Sound Quality Rating',
  CommentsForSE: 'Comments For SE'
};

const STATUSES = {
  Given: 'Given',
  WIP: 'WIP',
  Done: 'Done'
};

export class TrackEditor extends Devotee {
  get tasksTable() {
    return new Sheetfu.Table(
      this.spreadsheet.getSheets()[0].getDataRange(),
      COLUMNS.OutputFileName
    );
  }

  processUploads() {
    const files = this.uploadsFolder.searchFiles(`mimeType = '${FLAC_MIME_TYPE}'`);

    while (files.hasNext()) {
      const file = files.next();
      console.log('Processing “%s” uploaded by %s.', file.getName(), this.name);

      const taskId = file.getName().replace(/\.flac$/, '');

      // Finding corresponding task
      const task = this.tasksTable.getItemById(taskId);
      if (task) {
        switch (task.getFieldValue(COLUMNS.Status)) {
          case STATUSES.Done:
            GmailApp.sendEmail(
              this.emailAddress,
              `TE upload - ${this.name} - ${file.getName()} - ERROR`,
              '',
              {
                from: 'audioseva@purebhakti.info',
                name: 'Pure Bhakti Audio Seva',
                bcc: 'audioseva@purebhakti.info',
                htmlBody: `You have uploaded file “${file.getName()}” recently, however this task is already marked as Done. You cannot upload a new version now.`
              }
            );
            break;

          default:
            {
              DriveUtils.removeAllFiles(this.editedFolder, file.getName());

              // Making a copy and saving the file for further processing
              console.log(
                'Copying “%s” uploaded by %s into Edited folder.',
                file.getName(),
                this.name
              );
              const copiedFile = file.makeCopy(this.editedFolder);

              // Saving file link
              task.setFieldValue(COLUMNS.EditedFileLink, copiedFile.getUrl());
              task.commitFieldValue(COLUMNS.EditedFileLink);

              task.setFieldValue(COLUMNS.Status, STATUSES.WIP);
              task.commitFieldValue(COLUMNS.Status);

              GmailApp.sendEmail(
                'audioseva@purebhakti.info',
                `TE upload - ${this.name} - ${copiedFile.getName()}`,
                '',
                {
                  from: 'audioseva@purebhakti.info',
                  name: 'Pure Bhakti Audio Seva',
                  replyTo: this.emailAddress,
                  htmlBody: `
                    TE Doc: ${this.spreadsheet.getUrl()}<br><br>
                    Task Definition: ${task.getFieldValue(COLUMNS.TaskDefinition)}<br>
                    Source File Links:<br>
                      ${task.getFieldValue(COLUMNS.SourceFileLink1)}<br>
                      ${task.getFieldValue(COLUMNS.SourceFileLink2)}<br>
                      ${task.getFieldValue(COLUMNS.SourceFileLink3)}<br>
                    Edited File Link: ${copiedFile.getUrl()}<br>
                    Sound Quality Rating: ${task.getFieldValue(COLUMNS.SoundQualityRating)}<br>
                    Comments for SE: ${task.getFieldValue(COLUMNS.CommentsForSE)}<br>
                    `
                }
              );
            }
            break;
        }
      }

      if (!task) {
        console.warn('Task “%s” is not found in TE Doc of %s.', taskId, this.name);
        GmailApp.sendEmail(
          this.emailAddress,
          `TE upload - ${this.name} - ${file.getName()} - ERROR`,
          '',
          {
            from: 'audioseva@purebhakti.info',
            name: 'Pure Bhakti Audio Seva',
            bcc: 'audioseva@purebhakti.info',
            htmlBody: `You have uploaded “${file.getName()}” file recently, but there is no corresponding task in your TE Doc. Please recheck the file name and upload again.`
          }
        );
      }

      this.processedFolder.addFile(file);
      this.uploadsFolder.removeFile(file);
    }
  }
}
