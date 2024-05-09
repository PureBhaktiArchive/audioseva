/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import * as path from 'path';
import { AllotmentStatus } from '../Allotment';
import { FileResolution } from '../FileResolution';
import { FileVersion } from '../FileVersion';
import { Person } from '../Person';
import { StorageManager } from '../StorageManager';
import { asyncHandler } from '../asyncHandler';
import { abortCall, authorize } from '../auth';
import { TasksRepository } from './TasksRepository';
import express = require('express');
import _ = require('lodash');
import admin = require('firebase-admin');

export const processAllotment = functions
  .runWith({ maxInstances: 1, timeoutSeconds: 120 })
  .https.onCall(
    async (
      {
        assignee,
        tasks: taskIds,
        comment,
      }: { assignee: Person; tasks: string[]; comment: string },
      context
    ) => {
      authorize(context, ['TE.coordinator']);

      if (!assignee || !taskIds || taskIds.length === 0)
        abortCall('invalid-argument', 'Assignee and Tasks are required.');

      console.info(
        `Allotting ${taskIds.join(', ')} to ${assignee.emailAddress}`
      );

      const repository = new TasksRepository();
      const tasks = await repository.getTasks(taskIds);

      const dirtyTasks = _(tasks)
        .filter()
        .filter(({ status }) => status !== AllotmentStatus.Spare)
        .map(({ id }) => id)
        .join();

      if (dirtyTasks.length)
        abortCall(
          'aborted',
          `Files ${dirtyTasks} seem to be already allotted in the database. Please 🔨 the administrator.`
        );

      const updatedTasks = await repository.save(
        ...taskIds.map((id) => ({
          id,
          assignee,
          status: AllotmentStatus.Given,
          timestampGiven: admin.database.ServerValue.TIMESTAMP as number,
          versions: null, // Removing old versions
        }))
      );

      // Notify the assignee
      await admin
        .database()
        .ref(`/email/notifications`)
        .push({
          timestamp: admin.database.ServerValue.TIMESTAMP,
          template: 'track-editing/allotment',
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
  async ({ taskId }: { taskId: string }, context) => {
    authorize(context, ['TE.coordinator']);

    if (!taskId) abortCall('invalid-argument', 'Task ID is required.');

    const repository = new TasksRepository();
    const task = await repository.getTask(taskId);

    if (task.status === AllotmentStatus.Done)
      abortCall('aborted', `Task ${taskId} is already Done, cannot cancel.`);

    console.info(`Cancelling task ${taskId}`, task);

    await repository.save({
      id: taskId,
      status: AllotmentStatus.Spare,
      assignee: null,
      timestampGiven: null,
      versions: null, // Removing old versions
    });
  }
);

export const processUpload = functions
  .runWith({ maxInstances: 1, timeoutSeconds: 120 })
  .storage.bucket(StorageManager.getFullBucketName('te.uploads'))
  .object()
  .onFinalize(async (object) => {
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
    const taskId = path.basename(object.name, path.extname(object.name));

    const user = await admin.auth().getUser(uid);
    console.info(`Processing upload of ${taskId} by ${user.email}.`);

    const repository = new TasksRepository();
    let task = await repository.getTask(taskId);

    if (!task || !task.assignee) {
      console.warn(`Task ${taskId} is not assigned, aborting.`);
      return;
    }

    if (
      !user.customClaims?.roles?.TE?.coordinator &&
      !user.customClaims?.roles?.TE?.checker &&
      task.assignee.emailAddress.trim() !== user.email
    ) {
      console.error(
        `Task ${taskId} is assigned to "${task.assignee.emailAddress}" but uploaded by "${user.email}", aborting.`
      );
      return;
    }

    // Update the task status if it is not in Done status
    if (task.status !== AllotmentStatus.Done)
      await repository.save({
        id: taskId,
        status: AllotmentStatus.WIP,
      });

    const version: FileVersion = {
      timestamp: DateTime.fromISO(object.timeCreated).toMillis(),
      uploadPath: object.name,
      author: {
        uid: user.uid,
        emailAddress: user.email,
        name: user.displayName,
      },
    };

    task = await repository.saveNewVersion(taskId, version);

    const warnings = [];

    if (task.status === AllotmentStatus.Done)
      warnings.push('Task is already Done.');

    // Notify the coordinator
    await admin.database().ref(`/email/notifications`).push({
      timestamp: admin.database.ServerValue.TIMESTAMP,
      template: 'track-editing/upload',
      to: functions.config().te.coordinator.email_address,
      replyTo: task.assignee.emailAddress,
      params: {
        task,
        warnings,
      },
    });
  });

export const processResolution = functions
  .runWith({ maxInstances: 1, timeoutSeconds: 120 })
  .database.ref('/TE/tasks/{taskId}/versions/{versionKey}/resolution')
  .onWrite(async (change, { params: { taskId, versionKey } }) => {
    if (!change.after.exists()) return;

    const repository = new TasksRepository();
    const task = await repository.getTask(taskId);

    const resolution = change.after.val() as FileResolution;
    console.info(
      `Processing ${resolution.isRechecked ? 'RECHECKED' : ''}`,
      `resolution of ${taskId}(version ${versionKey}):`,
      `${
        resolution.isApproved
          ? 'approved'
          : `disapproved with feedback “${resolution.feedback}”`
      }.`
    );

    if (resolution.isApproved) {
      const version = task.versions[versionKey];
      const file = version.file // Explicit file reference takes precedence
        ? admin
            .storage()
            .bucket(version.file.bucket)
            .file(version.file.name, { generation: version.file.generation })
        : // Otherwise resorting to the uploaded file path
          StorageManager.getBucket('te.uploads').file(version.uploadPath);

      // Saving the approved file to the final storage bucket
      await file.copy(
        StorageManager.getDestinationFileForApprovedEdited(
          `${taskId}${path.extname(file.name)}`
        )
      );

      await repository.save({
        id: taskId,
        status: AllotmentStatus.Done,
        timestampDone: admin.database.ServerValue.TIMESTAMP as number,
      });
    } else {
      await repository.saveToSpreadsheet([task]);
      await admin.database().ref(`/email/notifications`).push({
        timestamp: admin.database.ServerValue.TIMESTAMP,
        template: 'track-editing/feedback',
        to: task.assignee.emailAddress,
        bcc: functions.config().te.coordinator.email_address,
        replyTo: functions.config().te.coordinator.email_address,
        params: {
          task,
          versionKey,
          resolution,
        },
      });
    }
  });

export const importTasks = functions
  .runWith({ timeoutSeconds: 120 })
  .pubsub.schedule('every day 00:00')
  .timeZone(functions.config().coordinator.timezone as string)
  .onRun(async () => {
    const repository = new TasksRepository();
    const count: number = await repository.importTasks();
    console.info(`Imported ${count} tasks.`);
  });

export const syncAllotments = functions
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .pubsub.schedule('every 1 hours from 05:00 to 00:00')
  .timeZone(functions.config().coordinator.timezone as string)
  .onRun(async () => {
    const repository = new TasksRepository();
    await repository.syncAllotments();
  });

export const download = functions.https.onRequest(
  express().get(
    '/te/tasks/:taskId/versions/:versionId/file',
    asyncHandler(async ({ params: { taskId, versionId } }, res) => {
      const repository = new TasksRepository();
      const task = await repository.getTask(taskId);

      if (!task) {
        res
          .status(404)
          .send('Task is not found, please contact the coordinator.');
        return;
      }

      const version = task.versions?.[versionId];
      if (!version) {
        res
          .status(404)
          .send('Version is not found, please contact the coordinator.');
        return;
      }

      const file = version.file // Explicit file reference takes precedence
        ? admin
            .storage()
            .bucket(version.file.bucket)
            .file(version.file.name, { generation: version.file.generation })
        : // Otherwise resorting to the uploaded file path
          StorageManager.getBucket('te.uploads').file(version.uploadPath);

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
        (key) => key <= versionId
      ).length;

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: DateTime.local().plus({ days: 3 }).toJSDate(),
        promptSaveAs: `${taskId}.v${versionNumber}${path.extname(file.name)}`,
      });

      console.log(
        `Redirecting ${taskId}/${versionId} to signed URL for`,
        `${file.bucket.name}/${file.name}`
      );
      res.redirect(307, url);
    })
  )
);
