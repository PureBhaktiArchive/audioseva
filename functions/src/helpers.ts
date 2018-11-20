// General Helper Functions
export const extractListFromFilename = (fileName) => {
    return fileName.match(/^[^-]*[^ -]/g)[0];
}


// SendInBlue Helper Functions
import * as functions from 'firebase-functions';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';
const sendInBlueSecretKey = functions.config().send_in_blue.key;
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = sendInBlueSecretKey;

const apiInstance = new SibApiV3Sdk.SMTPApi();

export const sendEmail = async (to, bcc, templateId, params) => {
    let smtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    smtpEmail = {
        to: [{ email: to }],
        bcc,
        templateId,
        params
    };

    let sendingResult = await apiInstance.sendTransacEmail(smtpEmail);
    console.log(sendingResult);
}

export const updateTemplate = async (templateId, html) => {
    let updatedTemplate = new SibApiV3Sdk.CreateSmtpTemplate();

    updatedTemplate.htmlContent = html;

    let updateResult = await apiInstance.updateSmtpTemplate(templateId, updatedTemplate);
    console.log(updateResult);

}



export const createTemplate = async (templateName, sender, html, subject) => {
    let smtpTemplate = new SibApiV3Sdk.CreateSmtpTemplate();

    smtpTemplate.templateName = templateName;
    smtpTemplate.htmlContent = html;
    smtpTemplate.subject = subject;
    smtpTemplate.sender = sender;
    smtpTemplate.isActive = true;

    let result = await apiInstance.createSmtpTemplate(smtpTemplate);
    return result['id'];
}


export const getTemplateId = async (templateName) => {
    var opts = { 'templateStatus': true };
    
    let result = await apiInstance.getSmtpTemplates(opts)
    let { templates } = result;

    let template = templates.filter(temp => temp['name'] === templateName)[0]

    if (template === undefined)
        return -1; // template not found
    else
        return templates['id'];
}


export const sendTestTemplate = async (templateId, emailTo) => {
    let testEmail = new SibApiV3Sdk.SendTestEmail();
    testEmail.emailTo = [emailTo];
    await apiInstance.sendTestTemplate(templateId, testEmail);

}
