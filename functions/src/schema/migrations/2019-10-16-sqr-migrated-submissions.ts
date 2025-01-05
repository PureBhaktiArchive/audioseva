/*!
 * sri sri guru gauranga jayatah
 */

import * as admin from 'firebase-admin';
import _ = require('lodash');

export const copyCompletedSubmissionsToMigratedBranch = async () => {
  const existingSubmissions = (
    await admin.database().ref('/submissions/SQR').once('value')
  ).val();

  await admin
    .database()
    .ref('/SQR/submissions/migrated')
    .set(
      _(existingSubmissions as object)
        .mapValues(_.partial(_.pickBy, _, 'completed'))
        .omitBy(_.isEmpty)
        .value()
    );
};
