import * as functions from 'firebase-functions';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';
const sendInBlueSecretKey = functions.config().send_in_blue.key;
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = sendInBlueSecretKey;

const apiInstance = new SibApiV3Sdk.SMTPApi();

export const extractListFromFilename = (fileName) => {
    return fileName.match(/^[^-]*[^ -]/g)[0];
}


export const sendEmail = (to, bcc, templateId, params) => {
    let apiInstance = new SibApiV3Sdk.SMTPApi();
    let sendEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendEmail = {
        to: [{ email: to }], // add a name prop if it fails to send
        bcc,
        templateId,
        params
    };

    apiInstance.sendTransacEmail(sendEmail).then(function(data) {
        // Message sending result
        console.log(data);
        return 1;
    }, err => console.log(err)).catch(err => console.log(err));
}


export const updateTemplate = (templateId, html) => {
    let updatedTemplate = new SibApiV3Sdk.CreateSmtpTemplate();

    updatedTemplate.htmlContent = html;

    apiInstance.updateSmtpTemplate(templateId, updatedTemplate).then(data => {
        console.log(data);
    },err => console.error(err)).catch(err => console.log(err));
}



export const createTemplate = (templateName, html, subject) => {
    let smtpTemplate = new SibApiV3Sdk.CreateSmtpTemplate();

    smtpTemplate.templateName = templateName;
    smtpTemplate.htmlContent = html;
    smtpTemplate.subject = subject;
    smtpTemplate.sender = {
      email: functions.config().coordinator.email_address // ASSUMED Until a comment is made upon it
    };
    smtpTemplate.isActive = true;

    return apiInstance.createSmtpTemplate(smtpTemplate).then(data => {
      return data['id'];
    },err => console.error(err)).catch(err => console.log(err));
}


export const getTemplateId = (templateName) => {
    var opts = { 'templateStatus': true };
    
    return apiInstance.getSmtpTemplates(opts).then(function(data) {
        let { templates } = data;    
        for (let i = 0; i < templates.length; i++) {
            if (templates[i]['name'] === templateName)
                return templates[i]['id'];
        }
    
    },err => console.error(err)).catch(err => console.log(err));
}