import * as functions from 'firebase-functions';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';
const sendInBlueSecretKey = functions.config().send_in_blue.key;
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = sendInBlueSecretKey;


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
