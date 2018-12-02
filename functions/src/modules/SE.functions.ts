import * as functions from 'firebase-functions';
import * as  admin from 'firebase-admin';


const db = admin.database();
const bucket = admin.storage().bucket();

import * as ffmpeg from 'ffmpeg-static';
import * as fs from 'fs';
import * as util from 'util';
require('util.promisify').shim();


const exec = util.promisify(require('child_process').exec);

import uniqid from 'uniqid';


/////////////////////////////////////////////////
//          processNewAllotment (DB create Trigger)
//      1. Mark the task/s in the database as given --> { status: "Given" }
//      1. Set the task/s `assignee`, and `timestampGiven`
//
//      2. Send an email to the assignee to notify them of the new allotment
//
/////////////////////////////////////////////////
export const processNewAllotment = functions.database
.ref('/sound-editing/restoration/allotments/{pushId}').onCreate(async (snapshot, context) => {
    const coordinator = functions.config().coordinator;

    const allotment = snapshot.val();

    let timestamp = new Date(allotment.timestamp);

    //  1. Ensure sound editor's `uploadCode`
    let userRef = await db.ref('/users').orderByChild('emailAddress')
            .equalTo(allotment.assignee.emailAddress).once('value');
    if (!userRef.exists()) {
        console.warn("Assignee wasn't found!");
        return -1;
    }
    let user = userRef.val();
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
        let taskIdMatch = regex.exec(taskId);
        const list = taskIdMatch[1];

        await db.ref(`/sound-editing/tasks/${list}/${taskId}/restoration`).update({
            status: 'Given',
            assignee: allotment.assignee,
            timestampGiven: admin.database.ServerValue.TIMESTAMP,
        });

        // Getting the tasks list to be used when notifying the assignee (Step 3)
        const taskRef = await db.ref(`/sound-editing/tasks/${list}/${taskId}`).once('value');
        tasks.push(taskRef.val());
    });
    

    // Getting the list of allotments to check if the assignee was allotted before
    const allotmentsRef = await db.ref('/sound-editing/restoration/allotments').orderByChild('assignee/emailAddress')
                                .equalTo(allotment.assignee.emailAddress).once('value');
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
            uploadURL: `${functions.config().website.base_url}/sound-editing/upload/${uploadCode}`,
            repeated: Object.keys(assigneeAllotments).length > 1
        }
    });
    return 1;
});


/////////////////////////////////////////////////
//               rearrangeChunks (HTTP Triggered)
//      1. loops through all the `flac` files under `edited` folder in Storage
//      2. gets corresponding DB nodes and applies CUTTING or MERGING debebding
//          on the data found in the DB node
//
/////////////////////////////////////////////////
export const rearrangeChunks = functions.https.onRequest( async (req, res) => {

    const ffmpegExecutable = ffmpeg.path;

    let bucketFiles = (await bucket.getFiles())[0];

    // Regex to get only files stored inside the `source` folder
    const regex = /source\/(\w+)\/((\w+|-)+).flac/
    let audioChunks = bucketFiles.filter(file => file.name.match(regex));

    // data { Object }
    //      contains every database node data in addition to
    //      1. path of corresponding file in storage.
    //      2. path of the file to create out of this node's corresponding file.
    let data = {};


    // lastChunk { Object }
    //      Used in creating new names for generated files.
    //      'Keys': here are serial numbers of each file.
    //      'Value': number of file names containing this serial number
    //      Example: 
    //          Files: [ 'BR-01A', 'BR-01B', 'BR-01C', 'BR-02A', 'BR-03A', 'BR-03B'  ]
    //          lastChunk: { '01': 3, '02': 1, '03' 2 }
    let lastChunk = {};

    for (let i = 0; i < audioChunks.length; i++) {
        let match = regex.exec(audioChunks[i].name);
        let list = match[1], chunkName = match[2]; // chunkName: list-serialCHAR.flac --> BR-01A.flac
        
        let chunkData = await db.ref(`/sound-editing/chunks/${list}/${chunkName}`).once('value');

        // extract Serial and Character
        let rgx = new RegExp(`${list}-(\\d+)(\\w+)`);
        if (!chunkData.exists()) 
            continue;

        let serial = rgx.exec(chunkName)[1];
        let charsToRemove = rgx.exec(chunkName)[2];


        // some of the arrays contain in a strange manner `undefined`,
        // so here I'm just getting rid of those `undefined`s
        let chunks = chunkData.val().filter(chunk => chunk != undefined);

        if (!lastChunk[serial])
            lastChunk[serial] = 0;
        
        // Empty array for the current node
        data[chunkName] = [];
        
        // loop through the chunks grouped under a particular Serial number
        for (let j = 0; j < chunks.length; j++) {
            // incremented number here is used in the TO GENERATE file name
            lastChunk[serial]++;
            
            let chunkData = chunks[j];

            let newName = chunkName.slice(0, -charsToRemove.length) + `-${lastChunk[serial]}.flac`;

            let beginning = (+chunkData.beginning) - 120;
            beginning = beginning < 0 ? 0: beginning;


            data[chunkName].push({
                beginning, 
                duration: (+chunkData.ending + 120) - (beginning),
                newName: `/tmp/${newName}`,
                destination: `edited/${newName}`,
                src: `/tmp/${chunkName}.flac`
            });

            let flacFile = bucket.file(`source/${list}/${chunkName}.flac`); // source file

            if (!fs.existsSync(`/tmp/${chunkName}.flac`)) 
                await flacFile.download({ destination: `/tmp/${chunkName}.flac` });

            let duration = (+chunkData.ending) - (+chunkData.beginning);

            let cmd;
            if (chunkData['continuationFrom']) { // merge
                //  chunkData['continuationFrom'] ==> Chunk to add to
                let chunkToAddTo = data[chunkData['continuationFrom']];
                

                let chunkToAddToPath = chunkToAddTo[chunkToAddTo.length - 1].newName;

                // Remove starting `/tmp/` from the name
                newName = chunkToAddToPath.slice(5)

                await flacFile.download({ destination: `/tmp/${newName}` });

                let chunkToAdd = `/tmp/${chunkName}.flac`;

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
                cmd = `"${ffmpegExecutable}" -loglevel error -ss ${+chunkData.beginning} -i /tmp/${chunkName}.flac -t ${duration} /tmp/${newName}`;
            }
            
            // Start Cutting/Merging files            
            await exec(cmd, { maxBuffer: 1024 * 10000 });
            
            // Upload new created Flac file to `edited` folder on the Storage bucket
            await bucket.upload(`/tmp/${newName}`, { destination: `edited/${newName}`, resumable: false });
            console.log(`/tmp/${newName} was uploaded successfully`);
        }
    }
    res.send("Files were edited successfully!");
});