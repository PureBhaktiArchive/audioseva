
/////////////////////////////////////////////////
//          OnNewAllotment (DB create and update Trigger)
//      1. Mark the files in the database --> { status: "Given" }
//              Function --> UpdateFilesOnNewAllotment
//
//      2. Send an email to the devotee to notify them of the new allotments
//              Function --> sendEmailOnFileAllotment
/////////////////////////////////////////////////

exports.UpdateFilesOnNewAllotment = function  (snapshot, db, updateFile) {

    const original = snapshot.val();
    let newDocKey = snapshot.key;
    original.files.forEach(file => {
        let file_ref = db.ref(`/sqr/files/${original.list}/${file}`);
        file_ref.child("status").once('value')
        .then(snapshot => {
            if(snapshot.exists())
                file_ref.update(
                    {
                        status: 'Given',
                        allotment: {
                            timestampGiven: new Date().getTime(),
                            timestampDone: null,
                            devotee: original.devotee
                        }
                    }, err => {
                        if(!err)
                            db.ref(`/sqr/allotments/${newDocKey}`).update({ filesAlloted: true });
                    });
            return 1;
        }).catch(err => console.log(err));
        // updateFile(db, file_ref, { status: 'Given' }, newDocKey);
    });

    return 1;    
}

exports.sendEmailOnFileAllotment = function  (coordinatorConfig, old, _new, new_snapshot, sendEmail) {

    if(!old.filesAlloted && _new.filesAlloted)
        if (_new.devotee)
            if(_new.devotee.emailAddress) {
                let email = _new.devotee.emailAddress;
                let bcc = [{ email: coordinatorConfig.email, name: coordinatorConfig.name }];
                let templateId = coordinatorConfig.templateid;

                let files = _new.files;
                let devotee = _new.devotee;
                let comment = _new.comment;
                let date = new Date();
                let repeated = false;

                sendEmail(
                    email,
                    bcc,
                    templateId,
                    {
                        files,
                        devotee,
                        comment,
                        date: `${date.getUTCDate() + 1}.${date.getUTCMonth() + 1}`,
                        repeated // set to True for now -- to be changed later
                    }                    
                );
                return new_snapshot.ref.child('mailSent').set(true);
            }
    return 1;
}

/////////////////////////////////////////////////
//          Sync Storage to DB (HTTP Trigger)
//
//      1. Add the currently uploaded MP3s into the DB
//              Function --> handleCurrentlyUploadedFiles
//
//      2. Remove DB entries for MP3s that don't exist
//              Function --> removeNonExistingMp3DBEntries
/////////////////////////////////////////////////

exports.handleCurrentlyUploadedFiles = (bucket, db, storeFileNameToDB) => {
    bucket.getFiles().then(files => {
        files.forEach(innerFilesObject => {
            innerFilesObject.forEach(file => {
                storeFileNameToDB(file.name, db);
            })
        });
        return 1;
    }).catch(err => console.log(err));
}


exports.removeNonExistingMp3DBEntries = (bucket, db, removeFileNameFromDB) => {
    let ref = db.ref(`/sqr/files`);
    ref.once("value").then(filesSnapshot => {
        let files = filesSnapshot.val();
        for (let list in files) {
            for (let file in files[list]) {                
                bucket.file(`/mp3/${list}/${file}.mp3`).exists((err, exists) => {
                    if(err) console.log(err);
                    else if(!exists)  
                        if(files[list][file]) 
                            //removing should be done only if the `status` is `Spare`
                            if (files[list][file].status === 'Spare') {
                                removeFromDB(db, `/sqr/files/${list}/${file}`)
                            }
                });
            }
        }
        return 1;
    }).catch(err => console.log(err));
}

/////////////////////////////////////////////////
//          Add MP3 name to DB (Storage Upload Trigger)
//
//      1. Add a newly MP3 name to the database
//              Function --> handleCurrentlyUploadedFiles
//
//      2. Remove DB entries for MP3s that don't exist
//              Function --> removeNonExistingMp3DBEntries
/////////////////////////////////////////////////

exports.handleNewUploads = (object, db, helpers) => {
    const filePath = object.name;
    
    if(helpers.checkValidMP3()){
        let ref = db.ref( createMP3DBRef(filePath) );
        //check if the file already exists in the RT db
        ref.child("status").once('value')
        .then(snapshot => {
            if(!snapshot.exists()) ref.set({status: "Spare"});
            else console.log("Existing");
            return 1;
        }).catch(err => console.log(err));
    }
    return 1;
}

let createMP3DBRef = filePath => {
    const parts = filePath.split('/');
        
    const list = parts[1];
    const mp3 = parts[2];
    let file_name = mp3.slice(0, -4);

    return `/sqr/files/${list}/${file_name}`;
}
