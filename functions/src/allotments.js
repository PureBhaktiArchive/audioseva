

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