/*
 * sri sri guru gauranga jayatah
 */

import { Devotee } from './Devotee';
import { DriveUtils } from '../DriveUtils';
import { SoundEditingWorkflow } from './SoundEditingWorkflow';
import { AudioSevaMailer } from '../AudioSevaMailer';

const COLUMNS = {
  DateGiven: 'Date Given',
  Status: 'Status',
  OutputFileName: 'Output File Name',
  Action: 'Action',
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
  processUploads() {
    if (!this.uploadsFolderId) return;

    const files = this.uploadsFolder.getFiles();

    while (files.hasNext()) {
      const file = files.next();
      this.processFile(file);
      this.processedFolder.addFile(file);
      this.uploadsFolder.removeFile(file);
    }
  }

  processFile(file) {
    console.log('Processing “%s” uploaded by %s.', file.getName(), this.name);

    if (file.getMimeType() !== 'audio/flac') {
      console.warn('File “%s” is of incorrect format “%s”.', file.getName(), file.getMimeType());
      this.sendFileProcessingErrorEmail(
        file,
        'The file is of incorrect format. Only FLAC files are accepted.'
      );
      return;
    }

    const taskId = file.getName().replace(/\.flac$/, '');

    // Finding corresponding task
    const task = SoundEditingWorkflow.TETasks.getItemById(taskId);

    if (!task || task.getFieldValue('TE Name') !== this.name) {
      console.warn('Task “%s” is not allotted to %s.', taskId, this.name);
      this.sendFileProcessingErrorEmail(
        file,
        'There is no corresponding task allotted to you. Please recheck the file name and upload again.'
      );
      return;
    }

    if (task.getFieldValue(COLUMNS.Status) === STATUSES.Done) {
      this.sendFileProcessingErrorEmail(
        file,
        `Task “${taskId}” is already marked as Done. You cannot upload a new version now.`
      );
      return;
    }

    DriveUtils.removeAllFiles(SoundEditingWorkflow.editedFolder, file.getName());

    // Making a copy and saving the file for further processing
    console.log('Copying “%s” uploaded by %s into Edited folder.', file.getName(), this.name);
    const copiedFile = file.makeCopy(SoundEditingWorkflow.editedFolder);

    // Saving file link
    task.setFieldValue(COLUMNS.EditedFileLink, copiedFile.getUrl());
    task.commitFieldValue(COLUMNS.EditedFileLink);

    task.setFieldValue(COLUMNS.Status, STATUSES.WIP);
    task.commitFieldValue(COLUMNS.Status);

    const emailTemplate = HtmlService.createTemplateFromFile('te-submission-email');
    emailTemplate.warnings = [];
    emailTemplate.task = task;

    AudioSevaMailer.sendEmail({
      subject: `TE Submission - ${this.name} - ${copiedFile.getName()}`,
      replyTo: this.emailAddress,
      htmlBody: emailTemplate.evaluate().getContent()
    });
  }

  sendFileProcessingErrorEmail(file, message) {
    AudioSevaMailer.sendEmail({
      recipient: this.emailAddress,
      subject: `TE Submission - ${file.getName()} - ${this.name} - ERROR`,
      htmlBody: `You have uploaded file “${file.getName()}” recently.<br>${message}`
    });
  }

  setupWorkspace() {
    if (this.uploadsFolderId) return;

    console.log('Creating workspace folder for %s', this.emailAddress);

    const workspaceFolder = DriveUtils.getOrCreateSubfolder(
      SoundEditingWorkflow.workspaceRootFolder,
      this.name
    );
    Drive.Permissions.insert(
      {
        role: 'writer',
        type: 'user',
        value: this.emailAddress
      },
      workspaceFolder.getId(),
      {
        sendNotificationEmails: 'false'
      }
    );

    const uploadsFolder = workspaceFolder.createFolder('Uploads');
    this.uploadsFolderId = uploadsFolder.getId();
  }
}
