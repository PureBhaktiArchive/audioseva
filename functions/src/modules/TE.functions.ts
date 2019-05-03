import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as moment from 'moment';
import * as helpers from './../helpers';
import * as path from 'path';

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
    if (
      !(await admin
        .database()
        .ref('/users')
        .orderByChild('emailAddress')
        .equalTo(assignee.emailAddress)
        .once('value')).exists()
    ) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        "Assignee wasn't found!"
      );
    }

    const tasksForEmail = await Promise.all(
      tasks.map(async (taskId: string) => {
        const list = helpers.extractListFromFilename(taskId);

        const taskRef = admin
          .database()
          .ref(`/edited/${list}/${taskId}/trackEditing`);

        await taskRef.update({
          status: 'Given',
          assignee: assignee,
          givenTimestamp: moment().format(),
        });

        // Getting the tasks list to be used when notifying the assignee
        const task = (await taskRef.once('value')).val();

        //inject filename and sourceFileLink into the task object returned by db call
        task.fileName = taskId;
        task.chunks.forEach(chunk => {
          chunk.sourceFileLink = `https://edited.${
            functions.config().storage['root-domain']
          }/${helpers.extractListFromFilename(chunk.fileName)}/${
            chunk.fileName
          }`;
        });
        return task;
      })
    );

    const coordinator = functions.config().coordinator;

    // Notify the assignee
    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'track-editing-allotment',
        to: assignee.emailAddress,
        bcc: coordinator.email_address,
        params: {
          tasks: tasksForEmail,
          assignee: assignee,
          comment: comment,
          date: moment()
            .utcOffset(coordinator.utc_offset)
            .format('DD.MM'),
          uploadURL: `${functions.config().website.base_url}/te/upload/`,
        },
      });
  }
);

const teUploadsBucket = `https://te.uploads.${
  functions.config().storage['root-domain']
}`;

const editedBucket = `https://edited.${
  functions.config().storage['root-domain']
}`;

const addTeSubmissionWarnings = (
  isAssignedToUser: boolean,
  isStatusDone: boolean
): string[] => {
  const warnings = [];
  if (!isAssignedToUser) warnings.push('User is not assigned to the task!');
  if (isStatusDone) warnings.push('Task is already in the Done status!');

  return warnings;
};

export const processSubmission = functions.storage
  .bucket(teUploadsBucket)
  .object()
  .onFinalize(async (object, context) => {
    const filePath = object.name;

    const teUser = admin.auth().getUser(context.auth.uid);

    const isDisabled = await teUser.then(x => x.disabled);
    if (isDisabled) {
      throw new Error(`Invalid User`);
    }

    const emailAddress = await teUser.then(x => x.email);
    const fileName = path.basename(filePath);
    const list = helpers.extractListFromFilename(fileName);

    const taskRef = admin
      .database()
      .ref(`/edited/${list}/${fileName}/trackEditing`);

    // Getting the tasks list to be used when notifying the user
    const task = (await taskRef.once('value')).val();

    const warnings = addTeSubmissionWarnings(
      task.assignee.emailAddress === emailAddress,
      task.status
    );

    //update task if task status is not done
    if (task.status.toLowerCase() !== 'done') {
      await taskRef.update({
        uploadPath: filePath,
        status: 'Submitted',
        submissionTimestamp: moment().format(),
      });
    }

    // Notify the user
    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'te-submission-email',
        to: emailAddress,
        params: {
          task,
          taskId: fileName,
          warnings,
        },
      });
  });

export const processFeedback = functions.database
  .ref('/edited/{list}/{taskId}/trackEditing/feedback')
  .onUpdate(
    async (
      change: functions.Change<functions.database.DataSnapshot>,
      context: functions.EventContext
    ): Promise<any> => {
      const { list } = context.params;
      const { taskId } = context.params;

      const taskRef = admin
        .database()
        .ref(`/edited/${list}/${taskId}/trackEditing`);

      await taskRef.update({
        status: 'Revise',
        feedbackTimestamp: moment().format(),
      });

      // Getting the tasks list to be used when notifying the user
      const task = (await taskRef.once('value')).val();

      return admin
        .database()
        .ref(`/email/notifications`)
        .push({
          to: task.assignee.emailAddress,
          template: 'te-feedback-email',
          params: {
            task,
            taskId,
          },
        });
    }
  );

export const processApproval = functions.database
  .ref('/edited/{list}/{taskId}/trackEditing/status')
  .onUpdate(
    async (
      change: functions.Change<functions.database.DataSnapshot>,
      context: functions.EventContext
    ): Promise<any> => {
      const statusBefore = change.before.val();
      const statusAfter = change.after.val();

      if (!(statusBefore === 'Submitted' && statusAfter === 'Done'))
        return null;

      const { list } = context.params;
      const { taskId } = context.params;

      const taskRef = admin
        .database()
        .ref(`/edited/${list}/${taskId}/trackEditing`);

      await taskRef.update({
        status: 'Done',
        doneTimestamp: moment().format(),
      });

      const storage = admin.storage();

      //copy file from upload bucked to edited bucket
      await storage
        .bucket(teUploadsBucket)
        .file(taskId)
        .copy(storage.bucket(editedBucket).file(taskId));
    }
  );
