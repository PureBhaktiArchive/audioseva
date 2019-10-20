/*!
 * sri sri guru gauranga jayatah
 */

import admin = require('firebase-admin');
import _ = require('lodash');

export const fillAuthors = async () => {
  const submissions = await admin
    .database()
    .ref('/SQR/submissions/final')
    .once('value');

  await Promise.all(
    _.map(submissions.val(), async (submission, fileName) => {
      const assigneeSnapshot = await admin
        .database()
        .ref('/SQR/allotments')
        .child(fileName)
        .child('assignee')
        .once('value');
      if (assigneeSnapshot.exists())
        await submissions.ref
          .child(fileName)
          .child('author')
          .set(assigneeSnapshot.val());
    })
  );
};
