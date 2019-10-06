/*!
 * sri sri guru gauranga jayatah
 */

import * as admin from 'firebase-admin';
import _ = require('lodash');

export const migrateSubmissions = async () => {
  const existing = (await admin
    .database()
    .ref('/submissions/SQR')
    .once('value')).val();

  await Promise.all([
    // Drafts
    admin
      .database()
      .ref('/SQR/submissions/drafts')
      .set(
        _.mapValues(existing, submissions =>
          _.omitBy(submissions, submission => submission.completed)
        )
      ),
    //Finals
    admin
      .database()
      .ref('/SQR/submissions/final')
      .set(
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

  await admin
    .database()
    .ref('/SQR/allotments')
    .set(existing);
};
