const functions = require('firebase-functions');
let SibApiV3Sdk = require('sib-api-v3-sdk');
const sendInBlueSecretKey = functions.config().send_in_blue.key;
const defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = sendInBlueSecretKey;



export const checkValidMP3 = filePath => (filePath.startsWith("mp3/") && filePath.endsWith(".mp3"))

export const createMP3DBRef = (filePath, _module) => {
    const parts = filePath.split('/');
        
    const list = parts[1];
    const mp3 = parts[2];
    let file_name = mp3.slice(0, -4);

    return `/${_module}/files/${list}/${file_name}`;
}

export const extractListFromFilename = (fileName) => {
    return fileName.match(/^[^-]*[^ -]/g)[0];
}


export const storeFileNameToDB = (filePath, db, _module) => {
    if(checkValidMP3(filePath)) {
        let ref = db.ref(createMP3DBRef(filePath, _module));

        //checking if the file already exists in the RT db
        ref.child("status").once('value')
        .then(snapshot => {
            if(!snapshot.exists())
                ref.set({status: "Spare"});
            return 1;
        }).catch(err => console.log(err));
    }
}

export const removeFromDB = (db, dbPath) => {
    let ref = db.ref(dbPath);
    ref.remove()
        .then(() => console.log("Deleted."))
        .catch(error => console.log(error));
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
