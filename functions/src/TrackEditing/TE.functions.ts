import * as functions from 'firebase-functions';
import { StorageManager } from '../StorageManager';
import { TrackEditingWorkflow } from './Workflow';

export const processAllotment = functions.https.onCall(
  async ({ assignee, tasks, comment }, context) => {
    if (
      !context.auth ||
      !context.auth.token ||
      !context.auth.token.coordinator
    ) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'The function must be called by an authenticated coordinator.'
      );
    }

    if (!assignee || !tasks || tasks.length === 0)
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Assignee and Tasks are required.'
      );

    await TrackEditingWorkflow.processAllotment(assignee, tasks, comment);
  }
);

export const cancelAllotment = functions.https.onCall(
  async ({ taskId }, context) => {
    if (
      !functions.config().emulator &&
      (!context.auth || !context.auth.token || !context.auth.token.coordinator)
    ) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'The function must be called by an authenticated coordinator.'
      );
    }

    if (!taskId)
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Task ID is required.'
      );

    await TrackEditingWorkflow.cancelAllotment(taskId);
  }
);

export const processUpload = functions.storage
  .bucket(StorageManager.trackEditedUploadsBucket)
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
