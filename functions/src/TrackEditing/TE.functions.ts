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

export const processUpload = functions.storage
  .bucket(StorageManager.trackEditedUploadsBucket)
  .object()
  .onFinalize(async (object, context) => {
    await TrackEditingWorkflow.processUpload(object, context.auth.uid);
  });

export const processResolution = functions.database
  .ref('/TE/tasks/{taskId}/versions/{versionNumber}/resolution')
  .onUpdate(
    async (change, { params: { taskId, versionNumber } }): Promise<any> => {
      await TrackEditingWorkflow.processResolution(
        taskId,
        versionNumber,
        change.after.val()
      );
    }
  );
