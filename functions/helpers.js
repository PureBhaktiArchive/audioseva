const functions = require('firebase-functions');
let SibApiV3Sdk = require('sib-api-v3-sdk');
const sendInBlueSecretKey = functions.config().audioseva.send_in_blue.key;
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = sendInBlueSecretKey;



exports.checkValidMP3 = filePath => (filePath.startsWith("mp3/") && filePath.endsWith(".mp3"))


exports.removeFromDB = (db, dbPath) => {
    let ref = db.ref(dbPath);
    ref.remove()
        .then(() => console.log("Deleted."))
        .catch(error => console.log(error));
}


exports.sendEmail = (to, bcc, templateId, params) => {
    let apiInstance = new SibApiV3Sdk.SMTPApi();
    sendEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendEmail = {
        to: [{ email: to }], // add a name prop if it fails to send
        bcc,
        templateId,
        params
    };

    apiInstance.sendTransacEmail(sendEmail).then(function(data) {
        console.log('API called successfully. Returned data: ');
        console.log(data);
        return 1;
    }, err => console.log(err)).catch(err => console.log(err));
}
