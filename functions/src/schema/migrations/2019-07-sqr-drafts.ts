/*!
 * sri sri guru gauranga jayatah
 */

import * as admin from 'firebase-admin';
import _ = require('lodash');

export const moveSubmissions = async () => {
  const existingSubmissions = (
    await admin.database().ref('/submissions/SQR').once('value')
  ).val();

  await Promise.all([
    admin
      .database()
      .ref('/SQR/submissions/drafts')
      .set(
        _(existingSubmissions as object)
          .mapValues(_.partial(_.omitBy, _, 'completed'))
          .omitBy(_.isEmpty)
          .value()
      ),
    admin
      .database()
      .ref('/SQR/submissions/final')
      .set(
        _(existingSubmissions)
          .mapValues(_.flow([_.values, _.partial(_.maxBy, _, 'completed')]))
          .omitBy(_.isEmpty)
          .value()
      ),
  ]);
};

export const moveAllotments = async () => {
  const existing = (
    await admin.database().ref('/allotments/SQR').once('value')
  ).val();

  await admin.database().ref('/SQR/allotments').set(existing);
};
