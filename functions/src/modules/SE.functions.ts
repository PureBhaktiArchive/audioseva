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

/////////////////////////////////////////////////
//               rearrangeChunks (DB create Trigger)
//      1. loops through all the `flac` files under `source` folder in Storage
//      2. gets corresponding DB nodes and applies CUTTING or MERGING depending
//          on the data found in the DB node
//
/////////////////////////////////////////////////

export const rearrangeChunks = functions.runWith({ memory: "512MB" }).database.ref(
    `${basePath}tasks/{list}/{taskId}`
).onCreate( async (snapshot, context) => {
  const { params: { list: listId, taskId } } = context;
  const rootDomain = functions.config().storage["root-domain"];
  const originalBucket = admin.storage().bucket(`original.${rootDomain}`);
  const roughEditedBucket = admin.storage().bucket(`rough.${rootDomain}`);
  const ffmpegExecutable = ffmpeg.path;

  const bucketFiles = (await originalBucket.getFiles())[0];

  // Regex to get only files stored inside the `source` folder
  const regex = /source\/(\w+)\/((\w+|-)+).flac/;
  const audioChunks = bucketFiles.filter(file => {
    return file.name.includes(`source/${listId}/${taskId.split("-").slice(0, 2).join("-")}`);
  });

  // data { Object }
  //      contains every database node data in addition to
  //      1. path of corresponding file in storage.
  //      2. path of the file to create out of this node's corresponding file.
  const data = {};


  // lastChunk { Object }
  //      Used in creating new names for generated files.
  //      'Keys': here are serial numbers of each file.
  //      'Value': number of file names containing this serial number
  //      Example:
  //          Files: [ 'BR-01A', 'BR-01B', 'BR-01C', 'BR-02A', 'BR-03A', 'BR-03B'  ]
  //          lastChunk: { '01': 3, '02': 1, '03' 2 }
  const lastChunk = {};

  for (const audioChunk of audioChunks) {
    const match = regex.exec(audioChunk.name);
    const list = match[1], chunkName = match[2]; // chunkName: list-serialCHAR.flac --> BR-01A.flac

    const chunkData = await db.ref(`/sound-editing/chunks/${list}/${chunkName}`).once('value');

    // extract Serial and Character
    const rgx = new RegExp(`${list}-(\\d+)(\\w+)`);
    if (!chunkData.exists())
      continue;

    const serial = rgx.exec(chunkName)[1];
    const charsToRemove = rgx.exec(chunkName)[2];


    // some of the arrays contain in a strange manner `undefined`,
    // so here I'm just getting rid of those `undefined`s
    const chunks = chunkData.val().filter(chunk => chunk !== undefined);

    if (!lastChunk[serial])
      lastChunk[serial] = 0;

    // Empty array for the current node
    data[chunkName] = [];

    // loop through the chunks grouped under a particular Serial number
    for (let j = 0; j < chunks.length; j++) {
      // incremented number here is used in the TO GENERATE file name
      lastChunk[serial]++;

      const chunk = chunks[j];

      let newName = chunkName.slice(0, -charsToRemove.length) + `-${lastChunk[serial]}.flac`;

      let beginning = (+chunk.beginning) - 120;
      beginning = beginning < 0 ? 0: beginning;
      const ending = +chunk.ending + 120;

      await db
          .ref(`${basePath}tasks/${listId}/${taskId}/chunks/${j}/editing`)
          .update({ beginning, ending });

      data[chunkName].push({
        beginning,
        duration: (ending) - (beginning),
        newName: `/tmp/${newName}`,
        destination: `edited/${newName}`,
        src: `/tmp/${chunkName}.flac`
      });

      const flacFile = originalBucket.file(`source/${list}/${chunkName}.flac`); // source file

      if (!fs.existsSync(`/tmp/${chunkName}.flac`))
        await flacFile.download({ destination: `/tmp/${chunkName}.flac` });

      const duration = (+chunk.ending) - (+chunk.beginning);

      let cmd;
      if (chunk['continuationFrom']) { // merge
        //  chunkData['continuationFrom'] ==> Chunk to add to
        const chunkToAddTo = data[chunk['continuationFrom']];

        const chunkToAddToPath = chunkToAddTo[chunkToAddTo.length - 1].newName;

        // Remove starting `/tmp/` from the name
        newName = chunkToAddToPath.slice(5);

        await flacFile.download({ destination: `/tmp/${newName}` });

        const chunkToAdd = `/tmp/${chunkName}.flac`;

        // Create a TEXT file having the Flac files to merge listed as follows:
        //                  file '/path/to/src1.flac'
        //                  file '/path/to/src2.flac'
        // Then run the ffmpeg executable to start merging the to files
        // into a file named `placeholder.flac`
        // Finally, rename `placeholder.flac` to `src1.flac` (The original file)
        cmd = `
                    echo "file '${chunkToAddToPath}'" > /tmp/filesToMerge && echo "file '${chunkToAdd}'" >> /tmp/filesToMerge &&
                    "${ffmpegExecutable}" -loglevel error -y -f concat -safe 0 -i /tmp/filesToMerge /tmp/placeholder.flac && mv /tmp/placeholder.flac ${chunkToAddToPath}
                `;

      } else {
        cmd = `"${ffmpegExecutable}" -loglevel error -ss ${+chunk.beginning} -i /tmp/${chunkName}.flac -t ${duration} /tmp/${newName}`;
      }

      // Start Cutting/Merging files
      await exec(cmd, { maxBuffer: 1024 * 10000 });
      // Upload new created Flac file to `edited` folder on the Storage bucket
      await roughEditedBucket.upload(
          `/tmp/${newName}`,
          { destination: `${listId}/${newName}`, resumable: false }
      );
      await db.ref(`${basePath}tasks/${listId}/${taskId}`).update({ roughFileCreated: true });
      console.log(`/tmp/${newName} was uploaded successfully`);
    }
  }
});
