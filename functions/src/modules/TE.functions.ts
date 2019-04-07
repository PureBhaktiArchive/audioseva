import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as moment from 'moment';
import * as helpers from './../helpers';

const db = admin.database();

/**
 * Saves allotment to the db and sends an email notification
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

    //  Check if Assignee is found
    const userRef = await db
      .ref('/users')
      .orderByChild('emailAddress')
      .equalTo(assignee.emailAddress)
      .once('value');
    if (!userRef.exists()) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        "Assignee wasn't found!"
      );
    }

    // Update the task
    const allTasks = await Promise.all(
      tasks.map(async (taskId: string) => {
        const list = helpers.extractListFromFilename(taskId);

        const teDbRef = db.ref(`/edited/${list}/${taskId}/trackEditing`);

        await teDbRef.update({
          status: 'Given',
          assignee: assignee,
          givenTimestamp: moment().format(),
        });

        // Getting the tasks list to be used when notifying the assignee
        const taskRef = await teDbRef.once('value');
        return { listName: list, fileName: taskId, task: taskRef.val() };
      })
    );

    const coordinator = functions.config().coordinator;

    // Notify the assignee
    await db.ref(`/email/notifications`).push({
      template: 'track-editing-allotment',
      to: assignee.emailAddress,
      bcc: coordinator.email_address,
      params: {
        tasks: allTasks,
        assignee: assignee,
        comment: comment,
        date: moment()
          .utcOffset(coordinator.utc_offset)
          .format('DD.MM'),
        fileLinkBaseUrl: `https://edited.${
          functions.config().storage['root-domain']
        }`,
        uploadURL: `${functions.config().website.base_url}/te/upload/`,
      },
    });
  }
);
