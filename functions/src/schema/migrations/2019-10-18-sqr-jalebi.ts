/*!
 * sri sri guru gauranga jayatah
 */

import _ = require('lodash');
import admin = require('firebase-admin');

export const untangleJalebi = async () => {
  const data = (await admin
    .database()
    .ref('/schema/data/2019-10-18-sqr-jalebi')
    .once('value')).val();

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
