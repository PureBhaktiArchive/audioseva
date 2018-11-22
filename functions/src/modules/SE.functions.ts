import * as functions from 'firebase-functions';
import * as  admin from 'firebase-admin';

import uniqid from 'uniqid';

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
            timestampGiven: Math.round((new Date()).getTime() / 1000),
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
