/*!
 * sri sri guru gauranga jayatah
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { ObjectMetadata } from 'firebase-functions/lib/providers/storage';
import { DateTime } from 'luxon';
import * as path from 'path';
import { AllotmentStatus } from '../Allotment';
import { Assignee } from '../Assignee';
import { DateTimeConverter } from '../DateTimeConverter';
import { FileResolution } from '../FileResolution';
import { FileVersion } from '../FileVersion';
import { Spreadsheet } from '../Spreadsheet';
import { StorageManager } from '../StorageManager';
import { TasksImporter } from './TasksImporter';
import { TrackEditingTask } from './TrackEditingTask';
import _ = require('lodash');

export class TrackEditingWorkflow {
  static baseRef = admin.database().ref(`/TE`);
  static tasksRef = TrackEditingWorkflow.baseRef.child(`tasks`);

  static getTaskRef(taskId: string) {
    return this.tasksRef.child(taskId);
  }

  private static async getTask(taskId: string) {
    const snapshot = await this.getTaskRef(taskId).once('value');
    if (!snapshot.exists()) throw new Error(`Task ${taskId} does not exist.`);

    return new TrackEditingTask(taskId, snapshot.val());
  }

  static async allotmentsSheet() {
    return await Spreadsheet.open(
      functions.config().te.allotments.spreadsheet.id,
      'Allotments'
    );
  }

  static async tasksSheet() {
    return await Spreadsheet.open(
      functions.config().te.tasks.spreadsheet.id,
      'Master List'
    );
  }

  static async processAllotment(
    assignee: Assignee,
    taskIds: string[],
    comment: string
  ) {
    console.info(`Allotting ${taskIds.join(', ')} to ${assignee.emailAddress}`);

    const updates = _(taskIds)
      .flatMap(taskId => [
        [`${taskId}/status`, AllotmentStatus.Given],
        [`${taskId}/assignee`, assignee],
        [`${taskId}/timestampGiven`, admin.database.ServerValue.TIMESTAMP],
      ])
      .fromPairs()
      .value();

    await this.tasksRef.update(updates);

    const tasks = await Promise.all(
      taskIds.map(async (taskId: string) => this.getTask(taskId))
    );

    const sheet = await this.allotmentsSheet();

    await sheet.updateOrAppendRows(
      'Task ID',
      tasks.map(task => ({
        'SEd?': false,
        'Task ID': task.id,
        Status: task.status,
        'Date Given': DateTimeConverter.toSerialDate(
          DateTime.fromMillis(task.timestampGiven)
        ),
        Devotee: task.assignee.name,
        Email: task.assignee.emailAddress,
      }))
    );

    // Notify the assignee
    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'track-editing-allotment',
        to: assignee.emailAddress,
        params: {
          tasks,
          assignee,
          comment,
        },
      });
  }

  static async processUpload(object: ObjectMetadata) {
    const uid = object.name.match(/^([^/]+)/)[0];
    const taskId = path.basename(object.name, '.flac');

    const user = await admin.auth().getUser(uid);
    console.info(`Processing upload of ${taskId} by ${user.email}.`);

    let task = await TrackEditingWorkflow.getTask(taskId);
    if (!task.assignee) throw new Error(`Task is not assigned.`);

    if (task.assignee.emailAddress !== user.email)
      throw new Error(
        `Task is assigned to ${task.assignee.emailAddress}, uploaded by ${user.email}.`
      );

    // Update the task status if it is not in Done status
    await this.getTaskRef(taskId)
      .child('status')
      .transaction((current: string) => {
        return current !== AllotmentStatus.Done
          ? AllotmentStatus.WIP
          : undefined;
      });

    const version = new FileVersion({
      timestamp: DateTime.fromISO(object.timeCreated).toMillis(),
      uploadPath: object.name,
    });

    await this.getTaskRef(taskId)
      .child('versions')
      .push(version);

    task = await TrackEditingWorkflow.getTask(taskId);

    const warnings = [];

    if (task.status === AllotmentStatus.Done)
      warnings.push('Task is already Done.');

    // Notify the user
    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'track-editing-upload',
        params: {
          task,
          lastVersion: task.lastVersion,
          warnings,
        },
      });
  }

  static async processResolution(
    taskId: string,
    versionKey: string,
    resolution: FileResolution
  ) {
    const task = await this.getTask(taskId);
    console.info(
      `Processing resolution of ${taskId} (version ${versionKey}): ${
        resolution.isApproved
          ? 'approved'
          : `disapproved with feedback “${resolution.feedback}”`
      }.`
    );

    if (resolution.isApproved) {
      // Saving the approved file to the final storage bucket
      await admin
        .storage()
        .bucket(StorageManager.trackEditedUploadsBucket)
        .file(task.versions[versionKey].uploadPath)
        .copy(StorageManager.getEditedFile(taskId));

      // Updating the database
      await this.getTaskRef(taskId).update({
        status: AllotmentStatus.Done,
        timestampDone: admin.database.ServerValue.TIMESTAMP,
      });

      // Updating the spreadsheet
      const sheet = await this.allotmentsSheet();

      const rowNumber = await sheet.findDataRowNumber('Task ID', taskId);
      if (!rowNumber)
        throw new Error(`Task ${taskId} is not found in the allotments sheet.`);

      await sheet.updateRow(rowNumber, {
        Status: AllotmentStatus.Done,
        'Date Done': DateTimeConverter.toSerialDate(DateTime.local()),
      });
    } else
      await admin
        .database()
        .ref(`/email/notifications`)
        .push({
          to: task.assignee.emailAddress,
          template: 'track-editing-feedback',
          params: {
            task,
            resolution,
          },
        });
  }

  static async importTasks() {
    const sheet = await this.tasksSheet();
    const rows = await sheet.getRows();
    const tasks = await new TasksImporter().import(rows);
    const newTasks = await Promise.all(
      // Map tasks to null if the Task ID exists in the database
      tasks.map(async task =>
        (await this.getTaskRef(task.id)
          .child('status')
          .once('value')).exists()
          ? null
          : task
      )
    );
    const updates = _(newTasks)
      // Filter out nulls.
      .filter()
      .map(task => [
        task.id,
        {
          status: AllotmentStatus.Spare,
          isRestored: task.isRestored,
          chunks: task.chunks,
        },
      ])
      .fromPairs()
      .value();

    await this.tasksRef.update(updates);
  }
}
