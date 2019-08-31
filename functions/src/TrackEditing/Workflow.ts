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

  static async processUpload(object: ObjectMetadata, uid: string) {
    const taskId = path.basename(object.name, '.flac');
    const task = await TrackEditingWorkflow.getTask(taskId);

    const user = await admin.auth().getUser(uid);

    const warnings = [];

    if (task.assignee.emailAddress !== user.email)
      warnings.push(
        `Task is assigned to ${task.assignee.emailAddress}, uploaded by ${user.email}.`
      );

    if (task.status === AllotmentStatus.Done)
      warnings.push('Task is already Done.');

    const version = new FileVersion({
      timestamp: DateTime.fromISO(object.timeCreated),
      uploadPath: object.name,
    });

    await this.getTaskRef(taskId)
      .child('versions')
      .push(version);

    // Update the task status if it is not in Done status
    if (task.status !== AllotmentStatus.Done) {
      await this.getTaskRef(taskId).update({
        status: AllotmentStatus.WIP,
      });
    }

    // Notify the user
    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'track-editing-upload',
        params: {
          task: {
            id: taskId,
            ...task,
          },
          warnings,
        },
      });
  }

  static async processResolution(
    taskId: string,
    versionNumber: number,
    resolution: FileResolution
  ) {
    const task = await this.getTask(taskId);
    if (resolution.isApproved) {
      await this.getTaskRef(taskId).update({
        status: AllotmentStatus.Done,
        timestampDone: admin.database.ServerValue.TIMESTAMP,
      });

      // Saving the approved file to the final storage bucket
      await admin
        .storage()
        .bucket(StorageManager.trackEditedUploadsBucket)
        .file(task.versions[versionNumber].uploadPath)
        .copy(admin.storage().bucket(StorageManager.trackEditedFilesBucket));
    } else
      await admin
        .database()
        .ref(`/email/notifications`)
        .push({
          to: task.assignee.emailAddress,
          template: 'track-editing-feedback',
          params: {
            task: {
              id: taskId,
              ...task,
            },
            resolution,
          },
        });
  }
}
