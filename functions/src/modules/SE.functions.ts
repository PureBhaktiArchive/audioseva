import * as functions from 'firebase-functions';
import * as  admin from 'firebase-admin';

import uniqid from 'uniqid';

const db = admin.database();
const bucket = admin.storage().bucket();


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
//
//          UploadProcessing (Storage Trigger)
//      1. Send a notification to the coordinator
//      2. Update the Task
//
/////////////////////////////////////////////////

export const uploadProcessing = functions.storage.object()
.onFinalize(async object => {    

    const filePath = object.name;


    if (!filePath.startsWith('sound-editing/restored/uploads'))
        return -1;
    
    
    const filePathRegex = /sound-editing\/restored\/uploads\/(\w+)\/(\w+)\/(\w+\/)*(([\w\d]+)-\d+-?\d+?)\.flac/;
    
    const match = filePathRegex.exec(filePath);
    if (!match) {
        console.log("Wrong Path -- File will be deleted.");
        bucket.file(object.name).delete();
        return -1;
    }

    const uploadCode = match[1], 
            timestamp = match[2],
            list = match[match.length - 1], 
            taskId = match[match.length - 2];
    

    let supposedAssignee = (await db.ref(`/users`).orderByChild('uploadCode').equalTo(uploadCode).once('value')).val();
    

    
    if (!supposedAssignee.exists()) { 
        console.log("Wrong Upload code -- File will be deleted.");
        bucket.file(object.name).delete();
        return -1;
    }

    // 1. Send a notification to the coordinator
    const taskRef = await db.ref(`/sound-editing/tasks/${list}/${taskId}`).once('value');

    if (!taskRef.exists()) {
        console.log("Task does not exist -- File will be deleted.");
        bucket.file(object.name).delete();
        return -1;
    }

    const task = taskRef.val();

    if (['Revise', 'Spare'].indexOf(task.restoration.status) < 0) {
        console.log("Incorrect task status (only [Revise OR Spare] is allowed here) -- File will be deleted.");
        bucket.file(object.name).delete();
        return -1;
    }

    const coordinator = functions.config().coordinator; // TO
    const replyTo = task.restoration.assignee.emailAddress;

    db.ref(`/email/notifications`).push({
        template: 'se-upload',
        to: coordinator.emailAddress,
        replyTo,
        params: { task }
    });

    // 2. Upload a copy of the file to `/sound-editing/restored/$list/$taskId.flac`
    bucket.file(object.name)
        .copy(bucket.file(`sound-editing/restored/${list}/${taskId}.flac`));


    // 3. Update the Task
    let taskRestorationUpdate = {
        status: 'In Review',
        timestampLastVersion: admin.database.ServerValue.TIMESTAMP
    };

    if (!task.restoration.timestampFirstVersion)
        taskRestorationUpdate['timestampFirstVersion'] = admin.database.ServerValue.TIMESTAMP;


    return taskRef.ref.child('restoration').update(taskRestorationUpdate);    
});