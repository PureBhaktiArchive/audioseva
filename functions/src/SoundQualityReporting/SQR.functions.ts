/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { abortCall, authorize } from '../auth';
import { Person } from '../Person';
import { SQRWorkflow } from './SQRWorkflow';
import { TasksRepository } from './TasksRepository';
import _ = require('lodash');

/**
 * SQR allotment processing
 */
export const processAllotment = functions.https.onCall(
  async (
    {
      assignee,
      files,
      comment,
    }: { assignee: Person; files: SpareFile[]; comment: string },
    context
  ) => {
    authorize(context, ['SQR.coordinator']);

    if (!assignee || !files || files.length === 0)
      abortCall('invalid-argument', 'Assignee and Files are required.');

    await SQRWorkflow.processAllotment(
      files.map(({ name }) => name),
      _.pick(assignee, 'emailAddress', 'name'),
      comment
    );
  }
);

/**
 * SQR new submission processing
 */
export const processSubmission = functions.database
  .ref('/SQR/submissions/completed/{fileName}/{token}')
  .onWrite(async (change, { params: { fileName, token } }) => {
    // Ignoring deletions
    if (!change.after.exists()) return;

    await SQRWorkflow.processSubmission(
      fileName,
      token,
      change.after.val(),
      change.before.exists()
    );
  });

/**
 * Gets lists with spare files
 */
export const getLists = functions.https.onCall(async (data, context) => {
  authorize(context, ['SQR.coordinator']);

  const repository = new TasksRepository();
  return await repository.getLists();
});

/**
 * Gets spare files for specified list and languages
 */
export const getSpareFiles = functions.https.onCall(
  async ({ list, language, languages, count }, context) => {
    authorize(context, ['SQR.coordinator']);
    return await SQRWorkflow.getSpareFiles(
      list,
      languages || [language],
      count
    );
  }
);

export const cancelAllotment = functions.https.onCall(
  async ({ fileName, comments, token, reason }) => {
    await SQRWorkflow.cancelAllotment(fileName, token, comments, reason);
  }
);

export const syncAllotments = functions.pubsub
  .schedule('every 1 hours synchronized')
  .timeZone(functions.config().coordinator.timezone)
  .onRun(async () => {
    const repository = new TasksRepository();
    await repository.syncAllotments({ createTasksInDatabase: true });
  });
