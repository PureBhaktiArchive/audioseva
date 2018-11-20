import * as functions from 'firebase-functions';
import * as  admin from 'firebase-admin';

const bucket = admin.storage().bucket();
const db = admin.database();
import * as helpers from './../helpers';

const path = require('path');
const os = require('os');
const fs = require('fs');


let emailTemplates = {};



/////////////////////////////////////////////////
//          Update Email Templates on sendInBlue 
//          in response to 
//          1. changes of the templates on FB (Storage Triggered)
//          2. changes of its metadata ( DB Update Trigger )
//
/////////////////////////////////////////////////


const updateEmailTemplates = async (filePath) => {
    // slice(0, -9) to get rid of the trailing '.mustache' extension
    const fileName = filePath.split('/')[2].slice(0, -9);
    const tempLocalFile = path.join(os.tmpdir(), fileName);
    
    
    if (!filePath.startsWith('email/templates')) 
        return;

    let emailRef = bucket.file(filePath);
    
    await emailRef.download({ destination: tempLocalFile });
    
    // Use the following to upate the template on SendInBlue
    let htmlContent = fs.readFileSync(tempLocalFile, 'utf-8');

    
    // 1. Get the template ID (sendInBlue ID)
    let templateNode = await db.ref('/email/templates').orderByKey()
                                .equalTo(fileName).once('value');
    let template = templateNode.val();

    if (!template.exists()) {
        console.log("Template metadata doesn't exist.");
        return;
    }
    
    let { sender, subject } = template;

    let id = helpers.getTemplateId(fileName);
    
    if (+id === -1) { // New Template
        id = await helpers.createTemplate(fileName, sender, htmlContent, subject);
        await db.ref(`/email/templates/${fileName}`)
                .update({ lastUpdated: new Date() });
    }            
    else {
        await helpers.updateTemplate(id, htmlContent);
        await db.ref(`/email/templates/${template.key}`)
                .update({ lastUpdated: new Date() });
    }

    // 2. Send a test Email confirming it has been updated correctly
    helpers.sendTestTemplate(id, sender.email);        
}

export const updateTemplatesOnTemplateUpload = functions.storage.object()
.onFinalize(object => { // called when either a NEW object is created, or when an object is overwritten
    updateEmailTemplates(object.name);
    return 1;
});

export const updateTemplatesOnMetadataChange = functions.database.ref('/email/templates}')
.onUpdate(async (change, context) => {    
    updateEmailTemplates(change.after.key);
    return 1;
});



export const sendNotificationEmail = functions.database.ref('/email/notifications}')
.onCreate(async (snapshot, context) => {
    const data = snapshot.val();
    const templateName = snapshot.key;

    let id;
    if (Object.keys(emailTemplates).indexOf(templateName) > -1)
        id = emailTemplates[templateName].id;
    else 
        id = await helpers.getTemplateId(templateName)

    await helpers.sendEmail(data.to, data.bcc, id, data.params);

    return snapshot.ref.update({ sent: true });
});