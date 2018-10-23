
const functions = require('firebase-functions');
var admin = require("firebase-admin");


admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: functions.config().audioseva.database_url,
    storageBucket: functions.config().audioseva.storage_bucket
});

const bucket = admin.storage().bucket();
const db = admin.database();

let storeFileNameToDB = (filePath) => {
    const parts = filePath.split('/');
    const list = parts[1];
    const mp3 = parts[2];
    let file_name = mp3.slice(0, -4);
    
    let ref = db.ref(`/sqr/files/${list}/${file_name}`);

    //checking if the file already exists in the RT db
    ref.child("status").once('value')
    .then(snapshot => {
        if(!snapshot.exists())
            ref.set({status: "Spare"});
        else
            console.log("Existing");

        return 1;
    }).catch(err => console.log(err));
}


exports.importMP3IntoSQR = functions.storage.object().onFinalize( object => {
    const filePath = object.name;
    
    if(filePath.indexOf("mp3/") > -1 && filePath.indexOf(".mp3") > 0) 
        file_name = storeFileNameToDB(filePath);

    return Promise.resolve(1);
});


exports.importCurrentMP3IntoSQR = functions.https.onRequest((req, res) => {
    
    bucket.getFiles().then(files => {
        console.log('Outer')
        console.log(files.toString());

        files.forEach(innerFilesObject => {
            console.log('Inner')
            console.log(innerFilesObject.toString());

            innerFilesObject.forEach(file => {
                if(file.name.indexOf("mp3/") > -1 && file.name.indexOf('.mp3') > 0)
                    storeFileNameToDB(file.name);
            })
        });

        return res.send(`All Mp3 file names were stored to the database`);
    }).catch(err => console.log(err));

});

