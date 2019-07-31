/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { Allotment } from '../classes/Allotment';
import { SQRSubmission } from '../classes/SQRSubmission';
import { SQRWorkflow } from '../classes/SQRWorkflow';
import _ = require('lodash');

/**
 * SQR allotment processing
 */
export const processAllotment = functions.https.onCall(
  async ({ assignee, files, comment }, context) => {
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

    if (!assignee || !files || files.length === 0)
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Devotee and Files are required.'
      );

    await SQRWorkflow.processAllotment(files, assignee, comment);
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
      new SQRSubmission(change.after.val()),
      change.before.exists()
    );
  });

export const importSpreadSheetData = functions.https.onCall(
  async (_data, context) => {
    if (
      !functions.config().emulator &&
      (!context.auth || !context.auth.token || !context.auth.token.coordinator)
    ) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'The function must be called by an authenticated coordinator.'
      );
    }

    await Promise.all([
      SQRWorkflow.importSubmissions(),
      SQRWorkflow.importAllotments(),
    ]);
  }
);

/**
 * On creation of a new allotment record id, update and sync data values to Google Spreadsheets
 *
 */
export const exportAllotmentToSpreadsheet = functions.database
  .ref('/SQR/allotments/{fileName}')
  .onWrite(async (change, { params: { fileName } }) => {
    // Ignore deletions
    if (!change.after.exists()) {
      console.info(`Ignoring deletion of ${fileName}.`);
      return;
    }

    console.info(fileName, change.before.val(), change.after.val());

    await SQRWorkflow.exportAllotment(
      new Allotment(fileName, change.after.val())
    );
  });

/**
 * Gets lists with spare files
 */
export const getLists = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token || !context.auth.token.coordinator)
    throw new functions.https.HttpsError(
      'permission-denied',
      'The function must be called by an authenticated coordinator.'
    );
  return await SQRWorkflow.getLists();
});

/**
 * Gets spare files for specified list and languages
 */
export const getSpareFiles = functions.https.onCall(
  async ({ list, language, languages, count }, context) => {
    if (!context.auth || !context.auth.token || !context.auth.token.coordinator)
      throw new functions.https.HttpsError(
        'permission-denied',
        'The function must be called by an authenticated coordinator.'
      );

    return await SQRWorkflow.getSpareFiles(list, languages, language, count);
  }
);

export const cancelAllotment = functions.https.onCall(
  async ({ fileName, comments, token, reason }) => {
    console.info(`${fileName}/${token}, ${reason}, ${comments}`);

    await SQRWorkflow.cancelAllotment(fileName, token, comments, reason);
  }
);

export const importStatuses = functions.pubsub
  .schedule('every 1 hours')
  .timeZone(functions.config().coordinator.timezone)
  .onRun(async () => {
    await SQRWorkflow.importStatuses();
  });
