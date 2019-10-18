/*!
 * sri sri guru gauranga jayatah
 */

import * as admin from 'firebase-admin';
import _ = require('lodash');

export const importRestoredAllotments = async () => {
  const data = {};
  const updates = _.chain(data)
    .flatMap((task, taskId) =>
      _.map(task, (value, key) => [`${taskId}/${key}`, value])
    )
    .fromPairs()
    .value();
  await admin
    .database()
    .ref('/SQR/allotments')
    .update(updates);
};
