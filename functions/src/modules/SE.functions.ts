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
  const allChunks = [snapshot.val()];

  // check for next chunk and create task id with current chunk and next chunk
  if (continuationTo) {
    const nextChunkResponse = await db
        .ref(`${chunksPath}${continuationTo}`)
        .once("value");
    const nextChunks = nextChunkResponse.val();
    if (nextChunks) {
      const nextChunk = nextChunks[0];
      allChunks.push(nextChunk);
      taskId = makeTaskId(fileName, chunks.length);
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
    allChunks.unshift(previousChunk);
    taskId = makeTaskId(fileName, previousChunks.length + chunks.length - 1);
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
    taskId = makeTaskId(fileName, chunks.length - 1);
    if (await validateTask(`${tasksPath}${taskId}`)) {
      console.error("Task exists");
      return;
    }
  }
  await db.ref(`${tasksPath}${taskId}`).set({
    chunks: allChunks,
    duration
  });
  return snapshot.val();
});



/**
 * Sends a notification email to the coordinator & udpates the corresponding Task
 */
const seUploadsBucketUrl = functions.config().sound_editing.uploads.bucket_name;
export const uploadProcessing = functions.storage.bucket(seUploadsBucketUrl).object()
.onFinalize(async object => {

  const filePath = object.name;
  const seUploadsBucket = admin.storage().bucket(seUploadsBucketUrl);

  try {
    const filePathRegex = /restored\/(\w+)\/(?:\w+\/)*(([\w]+)-\d+-\d+)\.flac/;
    const match = filePathRegex.exec(filePath);

    // [Check #1] File name should match `$taskId.flac` pattern.
    if (!match) {
      console.warn(`Wrong Path -- ${filePath} will be deleted.`);
      throw `Wrong Path -- ${filePath} will be deleted.`;
    }

    const uploadCode = match[1],
          taskId = match[2], 
          list = match[3];

    const supposedAssignee = await db.ref(`/users`)
      .orderByChild('uploadCode')
      .equalTo(uploadCode)
      .once('value');
    
    // [Check #3] The task should be assigned to a particular sound engineer 
    //  which is identified by the `uploadCode`within the file path.
    if (!supposedAssignee.exists()) { 
      console.warn(`Wrong Upload code -- ${filePath} will be deleted.`);
      throw `Wrong Upload code -- ${filePath} will be deleted.`;
    }

    const taskRef = await db.ref(`/sound-editing/tasks/${list}/${taskId}`).once('value');
    // [Check #2] The task should be found in the database by Id.
    if (!taskRef.exists()) {
      console.warn(`Task does not exist -- ${filePath} will be deleted.`);
      throw `Task does not exist -- ${filePath} will be deleted.`;
    }

    const task = taskRef.val();
    // [Check #4] The task should be in `Spare` or `Revise` status.
    if (['Revise', 'Spare'].indexOf(task.restoration.status) < 0) {
      console.warn(`Incorrect task status (only [Revise OR Spare] are allowed here) -- ${filePath} will be deleted.`);
      throw `Incorrect task status (only [Revise OR Spare] are allowed here) -- ${filePath} will be deleted.`;
    }


    // Move current file (after passing all validity checks) into `Restored` bucket
    seUploadsBucket.file(object.name).move(
      admin.storage().bucket(functions.config().sound_editing.restoration.bucket_name) //add to README
        .file(`${list}/${taskId}.flac`)
    );

    // Send an email notification to the coordinator
    db.ref(`/email/notifications`).push({
      template: 'se-upload',
      to: functions.config().coordinator.email_address,
      replyTo: task.restoration.assignee.emailAddress,
      params: { task }
    });  
    

    // Update the Task
    let taskRestorationUpdate = {
        status: 'In Review',
        timestampLastVersion: admin.database.ServerValue.TIMESTAMP
    };

    if (!task.restoration.timestampFirstVersion)
      taskRestorationUpdate['timestampFirstVersion'] = admin.database.ServerValue.TIMESTAMP;

    return taskRef.ref.child('restoration').update(taskRestorationUpdate);   

    
  } catch (err) {
    if (err) seUploadsBucket.file(filePath).delete();
  }
});
