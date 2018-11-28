import * as functions from 'firebase-functions';
import * as  admin from 'firebase-admin';

const db = admin.database();

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
    
    const filePathRegex = /sound-editing\/restored\/(\w+)\/(\w+)/g;

    if (!filePath.match(filePathRegex)) 
        return -1;    

    if (object.contentType === 'audio/flac') {
        console.error("Something is wrong with the file extension!")
        return -1;
    }
    
    const match = filePathRegex.exec(filePath);
    const list = match[1], fileNameFlac = match[2];
    const taskId = fileNameFlac.slice(0, -5); // strip the trailing ".flac" extenstion


    // 1. Send a notification to the coordinator
    const taskRef = await db.ref(`/sound-editing/tasks/${list}/${taskId}`).once('value');
    const task = taskRef.val();
    const replyTo = task.restoration.assignee.emailAddress;

    db.ref(`/email/notifications`).push({
        template: 'se-upload',
        to: functions.config().coordinator.emailAddress,
        replyTo,
        params: { task }
    });


    // 2. Update the Task
    let taskRestorationUpdate = {
        status: 'Uploaded',
        timestampLastVersion: admin.database.ServerValue.TIMESTAMP
    };

    if (!task.restoration.timestampFirstVersion)
        taskRestorationUpdate['timestampFirstVersion'] = admin.database.ServerValue.TIMESTAMP;


    return taskRef.ref.child('restoration').update(taskRestorationUpdate);    
});