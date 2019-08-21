/*!
 * sri sri guru gauranga jayatah
 */

import * as admin from 'firebase-admin';
import { SQRWorkflow } from '../../SoundQualityReporting/SQRWorkflow';
import _ = require('lodash');

export const migrateSubmissions = async () => {
  const existing = (await admin
    .database()
    .ref('/submissions/SQR')
    .once('value')).val();

  await Promise.all([
    // Drafts
    SQRWorkflow.draftSubmissionsRef.set(
      _.mapValues(existing, submissions =>
        _.omitBy(submissions, submission => submission.completed)
      )
    ),
    //Finals
    SQRWorkflow.finalSubmissionsRef.set(
      _.mapValues(existing, submissions =>
        _(submissions)
          .sortBy(submission => submission.completed)
          .findLast(submission => submission.completed)
      )
    ),
  ]);
};

export const migrateAllotments = async () => {
  const existing = (await admin
    .database()
    .ref('/allotments/SQR')
    .once('value')).val();

  await SQRWorkflow.allotmentsRef.set(existing);
};
