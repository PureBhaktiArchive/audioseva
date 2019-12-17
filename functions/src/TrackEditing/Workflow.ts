/*!
 * sri sri guru gauranga jayatah
 */

// tslint:disable-next-line: no-implicit-dependencies
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { ObjectMetadata } from 'firebase-functions/lib/providers/storage';
import { DateTime } from 'luxon';
import * as path from 'path';
import { AllotmentStatus } from '../Allotment';
import { Assignee } from '../Assignee';
import { abortCall } from '../auth';
import { FileResolution } from '../FileResolution';
import { FileVersion } from '../FileVersion';
import { StorageManager } from '../StorageManager';
import { TasksRepository } from './TasksRepository';
import _ = require('lodash');

export class TrackEditingWorkflow {
  static async processAllotment(
    assignee: Assignee,
    taskIds: string[],
    comment: string
  ) {
    console.info(`Allotting ${taskIds.join(', ')} to ${assignee.emailAddress}`);

    const repository = await TasksRepository.open();
    const tasks = await repository.getTasks(taskIds);

    const dirtyTasks = _(tasks)
      .filter()
      .filter(
        ({ status, token, timestampGiven }) =>
          !!token || !!timestampGiven || status !== AllotmentStatus.Spare
      )
      .map(({ id }) => id)
      .join();

    if (dirtyTasks.length)
      abortCall(
        'aborted',
        `Files ${dirtyTasks} seem to be already allotted in the database. Please 🔨 the administrator.`
      );

    const updatedTasks = await repository.save(
      ...taskIds.map(id => ({
        id,
        assignee,
        status: AllotmentStatus.Given,
        timestampGiven: admin.database.ServerValue.TIMESTAMP,
      }))
    );

    // Notify the assignee
    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'track-editing-allotment',
        to: assignee.emailAddress,
        bcc: functions.config().te.coordinator.email_address,
        replyTo: functions.config().te.coordinator.email_address,
        params: {
          tasks: updatedTasks,
          assignee,
          comment,
        },
      });
  }

  static async cancelAllotment(taskId: string) {
    const repository = await TasksRepository.open();
    const task = await repository.getTask(taskId);

    if (task.status === AllotmentStatus.Done)
      abortCall('aborted', `Task ${taskId} is already Done, cannot cancel.`);

    console.info(
      `Cancelling task ${taskId} currently assigned to ${task.assignee.emailAddress}`
    );

    await repository.save({
      id: taskId,
      status: AllotmentStatus.Spare,
      assignee: null,
      timestampGiven: null,
    });
  }

  static async processUpload(object: ObjectMetadata) {
    const uid = object.name.match(/^([^/]+)/)[0];
    const taskId = path.basename(object.name, '.flac');

    const user = await admin.auth().getUser(uid);
    console.info(`Processing upload of ${taskId} by ${user.email}.`);

    const repository = await TasksRepository.open();
    let task = await repository.getTask(taskId);

    if (!task.assignee) {
      console.error(`Task ${taskId} is not assigned, aborting.`);
      return;
    }

    if (task.assignee.emailAddress !== user.email) {
      console.error(
        `Task is assigned to ${task.assignee.emailAddress}, uploaded by ${user.email}.`
      );
      return;
    }

    // Update the task status if it is not in Done status
    if (task.status !== AllotmentStatus.Done)
      await repository.save({
        id: taskId,
        status: AllotmentStatus.WIP,
      });

    const version = new FileVersion({
      timestamp: DateTime.fromISO(object.timeCreated).toMillis(),
      uploadPath: object.name,
    });

    await repository.saveNewVersion(taskId, version);

    task = await repository.getTask(taskId);

    const warnings = [];

    if (task.status === AllotmentStatus.Done)
      warnings.push('Task is already Done.');

    // Notify the coordinator
    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'track-editing-upload',
        to: functions.config().te.coordinator.email_address,
        replyTo: task.assignee.emailAddress,
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
    const repository = await TasksRepository.open();
    const task = await repository.getTask(taskId);

    console.info(
      `Processing resolution of ${taskId} (version ${versionKey}): ${
        resolution.isApproved
          ? 'approved'
          : `disapproved with feedback “${resolution.feedback}”`
      }.`
    );

    if (resolution.isApproved) {
      // Saving the approved file to the final storage bucket
      await StorageManager.getBucket('te.uploads')
        .file(task.versions[versionKey].uploadPath)
        .copy(StorageManager.getFile('edited', `${taskId}.flac`));

      await repository.save({
        id: taskId,
        status: AllotmentStatus.Done,
        timestampDone: admin.database.ServerValue.TIMESTAMP,
      });
    } else
      await admin
        .database()
        .ref(`/email/notifications`)
        .push({
          template: 'track-editing-feedback',
          to: task.assignee.emailAddress,
          bcc: functions.config().te.coordinator.email_address,
          replyTo: functions.config().te.coordinator.email_address,
          params: {
            task,
            resolution,
          },
        });
  }

  static async importTasks() {
    const repository = await TasksRepository.open();
    const count = await repository.importTasks();
    console.info(`Imported ${count} tasks.`);
    return count;
  }
}
