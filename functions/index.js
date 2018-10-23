
const functions = require('firebase-functions');
var admin = require("firebase-admin");


admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://audio-seva-team-test.firebaseio.com",
    storageBucket: 'audio-seva-team-test.appspot.com'
});


exports.on_mp3_upload = functions.storage.object().onFinalize( object => {
    const filePath = object.name;
    
    if(filePath.indexOf(".mp3") > 0) {
        const parts = filePath.split('/');
        
        const list = parts[1];
        const mp3 = parts[2];
        let file_name = mp3.slice(0, -4);
        
        // NOTE :: Firebase will not allow the file name to have the following special characters
        // it's advisable to ensure on both the front end and the back end
        // the file name doesn't have any of them

        // WORKAROUND until a decision is made whether the file names should
        // be updated here or we should stop any upload trial that has a file name
        // with the forbidden characters ==> . # $ [ ]

        // Replacing all the special characters that Firebase refuse as a PATH name

        // Currently the file name in the storage and the path in the RT DB
        // will not match IF the file name has any of the special characters
        file_name = file_name.replace(/[.#$[\]]/g, '_');
        

        const db = admin.database();
        let ref = db.ref("/sqr/files/" + list + "/" + file_name);
        ref.set({status: "Spare"});
    }

    return Promise.resolve(1);
});


exports.currently_stored_mp3s_to_database = functions.https.onRequest((req, res) => {
    
    const bucket = admin.storage().bucket();
    const db = admin.database();
    bucket.getFiles().then(files => {        
        files.forEach(innerFilesObject => {
            innerFilesObject.forEach(file => {                
                if(file.name.indexOf('.mp3') > 0) {
                    const parts = file.name.split('/');
                    
                    const list = parts[1];
                    const mp3 = parts[2];
                    let file_name = mp3.slice(0, -4);
                    
                    file_name = file_name.replace(/[.#$[\]]/g, '_');

                    let ref = db.ref("/sqr/files/" + list + "/" + file_name);
                    ref.set({status: "Spare"});
                }
            })
        });

        return res.send("All Mp3 file names were stored to the database");
    }).catch(err => console.log(err));

});
