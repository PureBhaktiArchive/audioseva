import * as functions from 'firebase-functions';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';
const sendInBlueSecretKey = functions.config().send_in_blue.key;
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = sendInBlueSecretKey;

const apiInstance = new SibApiV3Sdk.SMTPApi();

export const sendEmail = async (to, bcc, templateId, params) => {
    let sendEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendEmail = {
        to: [{ email: to }],
        bcc,
        templateId,
        params
    };

    let sendingResult = await apiInstance.sendTransacEmail(sendEmail);
    console.log(sendingResult);
}

export const updateTemplate = async (templateId, html) => {
    let updatedTemplate = new SibApiV3Sdk.CreateSmtpTemplate();

    updatedTemplate.htmlContent = html;

    let updateResult = await apiInstance.updateSmtpTemplate(templateId, updatedTemplate);
    console.log(updateResult);

}



export const createTemplate = async (templateName, html, subject) => {
    let smtpTemplate = new SibApiV3Sdk.CreateSmtpTemplate();

    smtpTemplate.templateName = templateName;
    smtpTemplate.htmlContent = html;
    smtpTemplate.subject = subject;
    smtpTemplate.sender = {
      email: functions.config().coordinator.email_address // ASSUMED Until a comment is made upon it
    };
    smtpTemplate.isActive = true;

    let result = await apiInstance.createSmtpTemplate(smtpTemplate);
    return result['id'];
}


export const getTemplateId = async (templateName) => {
    var opts = { 'templateStatus': true };
    
    let result = await apiInstance.getSmtpTemplates(opts)
    let { templates } = result;    
    for (let i = 0; i < templates.length; i++) {
        if (templates[i]['name'] === templateName)
            return templates[i]['id'];
    }
}



  