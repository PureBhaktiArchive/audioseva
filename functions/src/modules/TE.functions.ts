import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as moment from 'moment';
import * as path from 'path';
import * as helpers from './../helpers';

const rootBucketDomain = functions.config().storage['root-domain'];
const teUploadsBucket = `te.uploads.${rootBucketDomain}`;
const editedBucket = `edited.${rootBucketDomain}`;

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

        //inject taskId and sourceFileLink into the task object returned by db call
        task.taskId = taskId;
        task.chunks.forEach(chunk => {
          chunk.sourceFileLink = `http://storage.googleapis.com/
            ${editedBucket}/
            ${helpers.extractListFromFilename(chunk.taskId)}/
            ${chunk.taskId}`;
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

export const processSubmission = functions.storage
  .bucket(teUploadsBucket)
  .object()
  .onFinalize(async (object, context) => {
    const user = await admin.auth().getUser(context.auth.uid);

    if (user.disabled) {
      throw new Error(`Invalid User`);
    }

    const taskId = path.basename(object.name, '.flac');
    const list = helpers.extractListFromFilename(taskId);

    const taskRef = admin
      .database()
      .ref(`/edited/${list}/${taskId}/trackEditing`);

    const task = (await taskRef.once('value')).val();

    const warnings = [];
    if (task.assignee.emailAddress !== user.email)
      warnings.push(`Task is assigned to ${task.assignee.emailAddress}, uploaded by ${user.email}.`);
    if (task.status === 'Done')
      warnings.push('Task is already Done.');

    //update task if task status is not done
    if (task.status.toLowerCase() !== 'done') {
      await taskRef.update({
        uploadPath: object.name,
        status: 'Submitted',
        submissionTimestamp: moment().format(),
      });
    }

    // Injecting additional fields for email notification
    task.id = taskId;
    task.uploadURL = `https://storage.googleapis.com/${teUploadsBucket}/${object.name}`;

    // Notify the user
    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'track-editing-submission',
        to: user.email,
        params: {
          task,
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
      const taskRef = change.before.ref.parent;

      await taskRef.update({
        status: 'Revise',
        feedbackTimestamp: moment().format(),
      });

      const task = (await taskRef.once('value')).val();

      // Injecting additional fields for email notification
      task.id = context.params.taskId;

      return admin
        .database()
        .ref(`/email/notifications`)
        .push({
          to: task.assignee.emailAddress,
          template: 'track-editing-feedback',
          params: {
            task
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

      const taskRef = change.before.ref.parent;

      await taskRef.update({
        status: 'Done',
        doneTimestamp: moment().format(),
      });

      const task = (await taskRef.once('value')).val();

      await admin.storage()
        .bucket(teUploadsBucket)
        .file(task.uploadPath)
        .copy(admin.storage().bucket(editedBucket));
    }
  );
