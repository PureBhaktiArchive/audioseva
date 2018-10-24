let checkValidity = filePath => (filePath.startsWith("mp3/") && filePath.endsWith(".mp3"))

let createRefString = filePath => {
    const parts = filePath.split('/');
        
    const list = parts[1];
    const mp3 = parts[2];
    let file_name = mp3.slice(0, -4);

    return `/sqr/files/${list}/${file_name}`;
}

exports.storeFileNameToDB = (filePath, db) => {
    if(checkValidity(filePath)) {
        let ref = db.ref( createRefString(filePath) );

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
}

exports.removeFileNameFromDB = (db, dbPath) => {
    let ref = db.ref(dbPath);
    ref.remove()
        .then(() => console.log("Deleted."))
        .catch(error => console.log(error));
}


exports.updateFile = (db, ref, payload, newDocKey) => {
    return ref.child("status").once('value')
    .then(snapshot => {
        if(snapshot.exists())
            ref.update(payload, err => {
                if(!err)
                    db.ref(`/sqr/allotments/${newDocKey}`).update({ filesAlloted: true });
            });
        return 1;
    }).catch(err => console.log(err));    
}

exports.sendEmail = (emailAddress, SibApiV3Sdk) => {
    let apiInstance = new SibApiV3Sdk.SMTPApi();
    let templateId = 2;// temporarily until we know where this will be stored

    let sendEmail = new SibApiV3Sdk.SendEmail([emailAddress]);

    apiInstance.sendTemplate(templateId, sendEmail).then(function(data) {
        console.log('Message sent successfully. Returned data: ' + JSON.stringify(data));
        return 1;
    }, function(error) {
        console.error(error);
    }).catch(err => console.log(err));
}
