import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import uniqid from 'uniqid';
import * as ffmpeg from 'ffmpeg-static';
import * as fs from 'fs';
import * as util from 'util';
require('util.promisify').shim();

import { taskIdRegex } from "../helpers";

const db = admin.database();

const exec = util.promisify(require('child_process').exec);

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
  const allChunks = [{ ...snapshot.val(), fileName }];

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
        await snapshot.ref.child("fileName").set(fileName);
      } else {
        return;
      }
    } else {
      return await snapshot.ref.child("fileName").set(fileName);
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
      await snapshot.ref.child("fileName").set(fileName);
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
    await db.ref(`${chunksPath}${fileName}/${index}`).update({ taskId });
    await snapshot.ref.child("fileName").set(fileName);
  }
  await db.ref(`${tasksPath}${taskId}`).set({
    chunks: allChunks,
    duration
  });
  return snapshot.val();
});

/////////////////////////////////////////////////
//               rearrangeChunks (DB create Trigger)
//      1. Loop through all chunks under task
//      2. Cut files based on beginning and duration
//      3. Merge files
//
/////////////////////////////////////////////////

export const produceRoughEditedFile = functions.runWith({ memory: "512MB" }).database.ref(
    `${basePath}tasks/{list}/{taskId}`
).onCreate( async (snapshot, context) => {
  const { params: { list: listId, taskId } } = context;
  const rootDomain = functions.config().storage["root-domain"];
  const originalBucket = admin.storage().bucket(`original.${rootDomain}`);
  const roughEditedBucket = admin.storage().bucket(`rough.${rootDomain}`);
  const { chunks } = snapshot.val();
  console.log(snapshot.val(), "snapshot");
  const filesToCleanUp = ["/tmp/placeholder.flac", "/tmp/filesToMerge"];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const { fileName } = chunk;
    const tmpFile = `/tmp/${fileName}.flac`;
    const currentFile = originalBucket.file(`source/${listId}/${fileName}.flac`);
    if (!fs.existsSync(tmpFile)) {
      await currentFile.download({ destination: tmpFile});
      filesToCleanUp.push(tmpFile);
    }

    let beginning = (+chunk.beginning) - 120;
    beginning = beginning < 0 ? 0: beginning;
    const ending = +chunk.ending + 120;
    const duration = (+chunk.ending) - (+chunk.beginning);
    const chunkPath = `/tmp/${fileName}-${i}.flac`;

    filesToCleanUp.push(chunkPath);
    await db
        .ref(`${basePath}tasks/${listId}/${taskId}/chunks/${i}/editing`)
        .update({ beginning, ending });

    const cutFileCommand = `
    echo "file '/tmp/${fileName}-${i}.flac'" >> /tmp/filesToMerge && 
    "${ffmpeg.path}" -loglevel error -ss ${+chunk.beginning} -i ${tmpFile} -t ${duration} ${chunkPath}
    `;
    await exec(cutFileCommand, { maxBuffer: 1024 * 10000 });
  }

  const mergeCommand = `
  "${ffmpeg.path}" -loglevel error -y -f concat -safe 0 -i /tmp/filesToMerge -c copy /tmp/placeholder.flac
  `;
  await exec(mergeCommand, { maxBuffer: 1024 * 10000 });
  await roughEditedBucket.upload(
      "/tmp/placeholder.flac",
      { destination: `/${listId}/${taskId}.flac`, resumable: false }
      );
  await db.ref(`${basePath}tasks/${listId}/${taskId}`).update({ roughFileCreated: true });
  for (const file of filesToCleanUp) {
    fs.unlinkSync(file);
  }
  console.log(`/${listId}/${taskId}.flac uploaded successfully`);
});
