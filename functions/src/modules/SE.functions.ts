import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import uniqid from 'uniqid';

import { taskIdRegex } from "../helpers";

const db = admin.database();

/////////////////////////////////////////////////
//          processNewAllotment (DB create Trigger)
//      1. Mark the task/s in the database as given --> { status: "Given" }
//      1. Set the task/s `assignee`, and `timestampGiven`
//
//      2. Send an email to the assignee to notify them of the new allotment
//
/////////////////////////////////////////////////
export const processNewAllotment = functions.database
  .ref('/sound-editing/restoration/allotments/{pushId}')
  .onCreate(async (snapshot, context) => {
    const coordinator = functions.config().coordinator;

    const allotment = snapshot.val();

    const timestamp = new Date(allotment.timestamp);

    //  1. Ensure sound editor's `uploadCode`
    const userRef = await db
      .ref('/users')
      .orderByChild('emailAddress')
      .equalTo(allotment.assignee.emailAddress)
      .once('value');
    if (!userRef.exists()) {
      console.warn("Assignee wasn't found!");
      return -1;
    }
    const user = userRef.val();
    let { uploadCode } = user;
    if (!uploadCode) {
      uploadCode = uniqid();
      userRef.ref.child('uploadCode').set({ uploadCode });
    }

    // 2. Update the task
    const { taskIds } = allotment;
    const tasks = [];
    taskIds.forEach(async taskId => {
      const regex = /(\w+)-(\d+)-(\d+)/g;
      const taskIdMatch = regex.exec(taskId);
      const list = taskIdMatch[1];

      await db
        .ref(`/sound-editing/tasks/${list}/${taskId}/restoration`)
        .update({
          status: 'Given',
          assignee: allotment.assignee,
          timestampGiven: admin.database.ServerValue.TIMESTAMP,
        });

      // Getting the tasks list to be used when notifying the assignee (Step 3)
      const taskRef = await db
        .ref(`/sound-editing/tasks/${list}/${taskId}`)
        .once('value');
      tasks.push(taskRef.val());
    });

    // Getting the list of allotments to check if the assignee was allotted before
    const allotmentsRef = await db
      .ref('/sound-editing/restoration/allotments')
      .orderByChild('assignee/emailAddress')
      .equalTo(allotment.assignee.emailAddress)
      .once('value');
    const assigneeAllotments = allotmentsRef.val();

    // 3. Notify the assignee
    await db.ref(`/email/notifications`).push({
      template: 'sound-editing-allotment',
      to: allotment.assignee.emailAddress,
      bcc: [{ email: coordinator.email_address }],
      params: {
        tasks,
        assignee: allotment.assignee,
        comment: allotment.comment,
        date: `${timestamp.getDate()}.${timestamp.getMonth() + 1}`,
        uploadURL: `${
          functions.config().website.base_url
        }/sound-editing/upload/${uploadCode}`,
        repeated: Object.keys(assigneeAllotments).length > 1,
      },
    });
    return 1;
  });

const basePath = "/sound-editing/";

const makeTaskId = (fileName: string, index: number) => {
  return `${fileName.match(taskIdRegex)[0]}-${index}`;
};

const validateTask = async (path: string) => {
  const response = await db.ref(path).once("value");
  return response.val();
};

export const createTaskFromChunks = functions.database.ref(
    "/sound-editing/chunks/{listId}/{fileName}/{index}"
).onCreate(async (snapshot, { params: { fileName, listId, index } }) => {
  const {
    continuationTo,
    continuationFrom,
    processingResolution = "",
    taskId: currentTaskId,
    beginning,
    ending
  } = snapshot.val();

  if (processingResolution.toLowerCase() !== "ok" || currentTaskId) return;
  const chunksPath = `${basePath}chunks/${listId}/`;
  const tasksPath = `${basePath}tasks/${listId}/`;
  const chunkDuration = ending - beginning;
  const chunkResponse = await db.ref(`${chunksPath}${fileName}`)
      .orderByKey()
      .limitToLast(1)
      .once("value");
  const chunks = chunkResponse.val() || [];
  let taskId;
  let duration;

  // check for next chunk and create task id with current chunk and next chunk
  if (continuationTo) {
    const nextChunkResponse = await db
        .ref(`${chunksPath}${continuationTo}`)
        .once("value");
    const nextChunks = nextChunkResponse.val();
    if (nextChunks) {
      const nextChunk = nextChunks[0];
      taskId = makeTaskId(fileName, chunks.length + 1);
      if (await validateTask(`${tasksPath}${taskId}`)) {
        console.error("Task exists");
        return;
      }
      if (nextChunk.continuationFrom === fileName) {
        duration = ending - beginning + (nextChunk.ending - nextChunk.beginning);
        await db.ref(`${chunksPath}${fileName}/${index}`).update({ taskId });
        await db.ref(`${chunksPath}${continuationTo}/0`).update({ taskId });
      } else {
        return;
      }
    } else {
      return;
    }
  } else if (continuationFrom) { // check for previous chunk
    const previousChunkResponse = await db
        .ref(`${chunksPath}${continuationFrom}`)
        .orderByKey()
        .limitToLast(1).once("value");
    const previousChunks = previousChunkResponse.val();
    const previousChunk = previousChunks[previousChunks.length - 1];
    taskId = makeTaskId(fileName, previousChunks.length + chunks.length);
    if (await validateTask(`${tasksPath}${taskId}`)) {
      console.error("Task exists");
      return;
    }
    if (previousChunk.continuationTo === fileName) {
      duration = chunkDuration + (previousChunk.ending - previousChunk.beginning);
      await db.ref(`${chunksPath}${continuationFrom}/${previousChunks.length - 1}`).update({ taskId });
      await db.ref(`${chunksPath}${fileName}/${index}`).update({ taskId });
    } else {
      console.error("Invalid continuationTo from previous chunk");
      return;
    }
  } else { // single chunk without a continuation
    duration = chunkDuration;
    taskId = makeTaskId(fileName, chunks.length);
    if (await validateTask(`${tasksPath}${taskId}`)) {
      console.error("Task exists");
      return;
    }
  }
  await db.ref(`${tasksPath}${taskId}/duration`).set(duration);
  return snapshot.val();
});
