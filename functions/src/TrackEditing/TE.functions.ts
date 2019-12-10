/*!
 * sri sri guru gauranga jayatah
 */

import express = require('express');
import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { abortCall, authorizeCoordinator } from '../auth';
import { StorageManager } from '../StorageManager';
import { TasksRepository } from './TasksRepository';
import { TrackEditingWorkflow } from './Workflow';

export const processAllotment = functions.https.onCall(
  async ({ assignee, tasks, comment }, context) => {
    authorizeCoordinator(context);

    if (!assignee || !tasks || tasks.length === 0)
      abortCall('invalid-argument', 'Assignee and Tasks are required.');

    await TrackEditingWorkflow.processAllotment(assignee, tasks, comment);
  }
);

export const cancelAllotment = functions.https.onCall(
  async ({ taskId }, context) => {
    authorizeCoordinator(context);

    if (!taskId) abortCall('invalid-argument', 'Task ID is required.');

    await TrackEditingWorkflow.cancelAllotment(taskId);
  }
);

export const processUpload = functions.storage
  .bucket(StorageManager.getFullBucketName('te.uploads'))
  .object()
  .onFinalize(async (object, context) => {
    // `context.auth` is not populated here. See https://stackoverflow.com/a/49723193/3082178
    await TrackEditingWorkflow.processUpload(object);
  });

export const processResolution = functions.database
  .ref('/TE/tasks/{taskId}/versions/{versionKey}/resolution')
  .onCreate(async (resolution, { params: { taskId, versionKey } }) => {
    await TrackEditingWorkflow.processResolution(
      taskId,
      versionKey,
      resolution.val()
    );
  });

export const importTasks = functions.pubsub
  .schedule('every day 00:00')
  .timeZone(functions.config().coordinator.timezone)
  .onRun(async () => {
    await TrackEditingWorkflow.importTasks();
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

      const url = (
        await file.getSignedUrl({
          action: 'read',
          expires: DateTime.local()
            .plus({ days: 3 })
            .toJSDate(),
          promptSaveAs: `${taskId}.v${versionId}.flac`,
        })
      ).shift();

      console.log(`Redirecting ${taskId}.${versionId} to ${url}`);
      res.redirect(307, url);
    }
  )
);
