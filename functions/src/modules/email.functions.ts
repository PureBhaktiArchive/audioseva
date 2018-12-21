import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// SendInBlue Helper Imports
import * as SibApiV3Sdk from 'sib-api-v3-sdk';
const sendInBlueSecretKey = functions.config().send_in_blue.key;
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = sendInBlueSecretKey;
const apiInstance = new SibApiV3Sdk.SMTPApi();

const bucket = admin.storage().bucket();
const db = admin.database();

const path = require('path');
const os = require('os');
const fs = require('fs');

// used for caching in `sendNotificationEmail` function
let emailTemplates = {};

// SendInBlue Helper Functions
export const sendEmail = async (to, bcc, replyTo, templateId, params) => {
  let smtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  smtpEmail = {
    to: [{ email: to }],
    bcc,
    replyTo,
    templateId,
    params,
  };

  let sendingResult = await apiInstance.sendTransacEmail(smtpEmail);
  console.log(sendingResult);
};

export const updateTemplate = async (templateId, html) => {
  let updatedTemplate = new SibApiV3Sdk.CreateSmtpTemplate();

  updatedTemplate.htmlContent = html;

  let updateResult = await apiInstance.updateSmtpTemplate(
    templateId,
    updatedTemplate
  );
  console.log(updateResult);
};

export const createTemplate = async (templateName, sender, html, subject) => {
  let smtpTemplate = new SibApiV3Sdk.CreateSmtpTemplate();

  smtpTemplate.templateName = templateName;
  smtpTemplate.htmlContent = html;
  smtpTemplate.subject = subject;
  smtpTemplate.sender = sender;
  smtpTemplate.isActive = true;

  let result = await apiInstance.createSmtpTemplate(smtpTemplate);
  return result['id'];
};

export const getTemplateId = async templateName => {
  var opts = { templateStatus: true };

  let result = await apiInstance.getSmtpTemplates(opts);
  let { templates } = result;

  let template = templates.filter(temp => temp['name'] === templateName)[0];

  if (template === undefined) return -1;
  // template not found
  else return templates['id'];
};

/////////////////////////////////////////////////
//          Update Email Templates on sendInBlue
//          in response to
//          1. changes of the templates on FB (Storage Triggered)
//          2. changes of its metadata ( DB Update Trigger )
//
/////////////////////////////////////////////////

const updateEmailTemplates = async filePath => {
  // slice(0, -9) to get rid of the trailing '.mustache' extension
  const fileName = filePath.split('/')[2].slice(0, -9);
  const tempLocalFile = path.join(os.tmpdir(), fileName);

  if (!filePath.startsWith('email/templates')) return;

  let emailRef = bucket.file(filePath);

  await emailRef.download({ destination: tempLocalFile });

  // Use the following to upate the template on SendInBlue
  let htmlContent = fs.readFileSync(tempLocalFile, 'utf-8');

  // 1. Get the template ID (sendInBlue ID)
  let templateNode = await db
    .ref('/email/templates')
    .orderByKey()
    .equalTo(fileName)
    .once('value');
  let template = templateNode.val();

  if (!template.exists()) {
    console.log("Template metadata doesn't exist.");
    return;
  }

  let { sender, subject } = template;

  let id = getTemplateId(fileName);

  if (+id === -1) {
    // New Template
    id = await createTemplate(fileName, sender, htmlContent, subject);
    await db
      .ref(`/email/templates/${fileName}`)
      .update({ lastUpdated: new Date() });
  } else {
    await updateTemplate(id, htmlContent);
    await db
      .ref(`/email/templates/${template.key}`)
      .update({ lastUpdated: new Date() });
  }

  // 2. Send a test Email confirming it has been updated correctly
  let testEmail = new SibApiV3Sdk.SendTestEmail();
  await apiInstance.sendTestTemplate(id, testEmail);
};

export const updateTemplatesOnTemplateUpload = functions.storage
  .object()
  .onFinalize(object => {
    // called when either a NEW object is created, or when an object is overwritten
    updateEmailTemplates(object.name);
    return 1;
  });

export const updateTemplatesOnMetadataChange = functions.database
  .ref('/email/templates}')
  .onUpdate(async (change, context) => {
    updateEmailTemplates(change.after.key);
    return 1;
  });

export const sendNotificationEmail = functions.database
  .ref('/email/notifications}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.val();
    const templateName = snapshot.key;

    let id;
    if (Object.keys(emailTemplates).indexOf(templateName) > -1)
      id = emailTemplates[templateName].id;
    else {
      id = await getTemplateId(templateName);
      emailTemplates[templateName] = { id };
    }

    if (!data['sentTimestamp']) {
      await sendEmail(data.to, data.bcc, data.replyTo, id, data.params);
      await snapshot.ref.update({
        sentTimestamp: admin.database.ServerValue.TIMESTAMP,
      });
    }

    return 1;
  });
