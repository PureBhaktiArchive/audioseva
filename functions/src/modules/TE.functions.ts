import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as moment from 'moment';

const db = admin.database();

/**
 * Saves allotment to the spreadsheet and sends an email notification
 */
export const processAllotment = functions.https.onCall(
  async ({ assignee, tasks, comment }, context): Promise<void> => {
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
        'Devotee and Tasks are required.'
      );

    /// Send the allotment email
    const coordinator = functions.config().coordinator;

    //  Check if Assignee is found
    const userRef = await db
      .ref('/users')
      .orderByChild('emailAddress')
      .equalTo(assignee.emailAddress)
      .once('value');
    if (!userRef.exists()) {
      throw new functions.https.HttpsError(
        'not-found',
        "Assignee wasn't found!."
      );
    }

    // Update the task
    const allTasks = [];
    tasks.forEach(async taskId => {
      const regex = /(\w+)-(\d+)-(\d+)/g;
      const taskIdMatch = regex.exec(taskId);
      const list = taskIdMatch[1];

      await db.ref(`/edited/${list}/${taskId}/trackEditing`).update({
        status: 'Given',
        assignee: assignee,
        givenTimestamp: moment().format('MM/DD/YYYY'),
      });

      // Getting the tasks list to be used when notifying the assignee (Step 3)
      const taskRef = await db
        .ref(`/edited/${list}/${taskId}/trackEditing`)
        .once('value');
      allTasks.push(taskRef.val());
    });

    // 3. Notify the assignee
    await db.ref(`/email/notifications`).push({
      template: 'track-editing-allotment',
      to: assignee.emailAddress,
      bcc: coordinator.email_address,
      params: {
        tasks,
        assignee: assignee,
        comment: comment,
        date: moment()
          .utcOffset(coordinator.utc_offset)
          .format('DD.MM'),
        uploadURL: `${functions.config().website.base_url}/te/upload/`,
        repeated: true,
      },
    });
  }
);
