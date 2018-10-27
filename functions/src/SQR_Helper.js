
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
        let ref = db.ref(`/sqr/files/${original.list}/${file}`);
        updateFile(db, ref, { status: 'Given' }, newDocKey);
    });

    return 1;    
}

exports.sendEmailOnFileAllotment = function  (old, _new, new_snapshot, SibApiV3Sdk, sendEmail) {

    if(!old.filesAlloted && _new.filesAlloted)
        if (_new.devotee)
            if(_new.devotee.emailAddress) {
                let email = _new.devotee.emailAddress;
                sendEmail(email, SibApiV3Sdk);
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
                                removeFileNameFromDB(db, `/sqr/files/${list}/${file}`)
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

exports.handleNewUploads = (object, db, storeFileNameToDB) => {
    const filePath = object.name;
    
    storeFileNameToDB(filePath, db);

    return 1;
}