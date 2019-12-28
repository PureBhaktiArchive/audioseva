/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import * as path from 'path';
import { AllotmentStatus } from '../Allotment';
import { abortCall, authorizeCoordinator } from '../auth';
import { FileVersion } from '../FileVersion';
import { Person } from '../Person';
import { StorageManager } from '../StorageManager';
import { TasksRepository } from './TasksRepository';
import express = require('express');
import _ = require('lodash');
import admin = require('firebase-admin');

export const processAllotment = functions.https.onCall(
  async (
    {
      assignee,
      tasks: taskIds,
      comment,
    }: { assignee: Person; tasks: string[]; comment: string },
    context
  ) => {
    authorizeCoordinator(context);

    if (!assignee || !taskIds || taskIds.length === 0)
      abortCall('invalid-argument', 'Assignee and Tasks are required.');

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
);

export const cancelAllotment = functions.https.onCall(
  async ({ taskId }, context) => {
    authorizeCoordinator(context);

    if (!taskId) abortCall('invalid-argument', 'Task ID is required.');

    const repository = await TasksRepository.open();
    const task = await repository.getTask(taskId);

    if (task.status === AllotmentStatus.Done)
      abortCall('aborted', `Task ${taskId} is already Done, cannot cancel.`);

    console.info(`Cancelling task ${taskId}`, task);

    await repository.save({
      id: taskId,
      status: AllotmentStatus.Spare,
      assignee: null,
      timestampGiven: null,
    });
  }
);

export const processUpload = functions.storage
  .bucket(StorageManager.getFullBucketName('te.uploads'))
  .object()
  .onFinalize(async (object, context) => {
    // tslint:disable-next-line: triple-equals
    if (object.contentDisposition != null) {
      console.info(
        `Unsetting content disposition. Current value: `,
        object.contentDisposition
      );
      await admin
        .storage()
        .bucket(object.bucket)
        .file(object.name)
        .setMetadata({ contentDisposition: null });
    }

    // `context.auth` is not populated here. See https://stackoverflow.com/a/49723193/3082178
    const uid = object.name.split('/').shift();
    const taskId = path.basename(object.name, '.flac');

    const user = await admin.auth().getUser(uid);
    console.info(`Processing upload of ${taskId} by ${user.email}.`);

    const repository = await TasksRepository.open();
    let task = await repository.getTask(taskId);

    if (!task || !task.assignee) {
      console.error(`Task ${taskId} is not assigned, aborting.`);
      return;
    }

    if (
      !user.customClaims['coordinator'] &&
      task.assignee.emailAddress !== user.email
    ) {
      console.error(
        `Task is assigned to ${task.assignee.emailAddress}, aborting.`
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

    task = await repository.saveNewVersion(taskId, version);

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
  });

export const processResolution = functions.database
  .ref('/TE/tasks/{taskId}/versions/{versionKey}/resolution')
  .onCreate(async (resolution, { params: { taskId, versionKey } }) => {
    const repository = await TasksRepository.open();
    const task = await repository.getTask(taskId);

    console.info(
      `Processing resolution of ${taskId} (version ${versionKey}): ${
        resolution.val().isApproved
          ? 'approved'
          : `disapproved with feedback “${resolution.val().feedback}”`
      }.`
    );

    if (resolution.val().isApproved) {
      // Saving the approved file to the final storage bucket
      await StorageManager.getBucket('te.uploads')
        .file(task.versions[versionKey].uploadPath)
        .copy(StorageManager.getFile('edited', `${taskId}.flac`));

      await repository.save({
        id: taskId,
        status: AllotmentStatus.Done,
        timestampDone: admin.database.ServerValue.TIMESTAMP,
      });
    } else {
      await repository.saveToSpreadsheet([task]);
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
  });

export const importTasks = functions.pubsub
  .schedule('every day 00:00')
  .timeZone(functions.config().coordinator.timezone)
  .onRun(async () => {
    const repository = await TasksRepository.open();
    const count: number = await repository.importTasks();
    console.info(`Imported ${count} tasks.`);
  });

export const download = functions.https.onRequest(
  express().get(
    '/te/tasks/:taskId/versions/:versionId/file',
    async ({ params: { taskId, versionId } }, res) => {
      const repository = await TasksRepository.open();
      const task = await repository.getTask(taskId);

      if (!task) {
        res
          .status(404)
          .send('Task is not found, please contact the coordinator.');
        return;
      }

      const version = task.versions[versionId];
      if (!version) {
        res
          .status(404)
          .send('Version is not found, please contact the coordinator.');
        return;
      }

      const file = StorageManager.getBucket('te.uploads').file(
        version.uploadPath
      );

      if (!(await file.exists()).shift()) {
        res
          .status(404)
          .send('File does not exist, please contact the coordinator.');
        return;
      }

      /**
       * Version keys are added in the lexographical order
       * So the requested version number is just a length of this filtered array
       */
      const versionNumber = _.keys(task.versions).filter(
        key => key <= versionId
      ).length;

      const url = (
        await file.getSignedUrl({
          action: 'read',
          expires: DateTime.local()
            .plus({ days: 3 })
            .toJSDate(),
          promptSaveAs: `${taskId}.v${versionNumber}.flac`,
        })
      ).shift();

      console.log(`Redirecting ${taskId}/${versionId} to ${url}`);
      res.redirect(307, url);
    }
  )
);
