

exports.sendEmailOnNewAllotment = (snapshot, db, request, sendInBlueSecretKey, sendEmail) => {

    const original = snapshot.val();
    let files_updated = true;

    if (original.files && original.list)
        original.files.forEach(file => {
            ref = db.ref(`/sqr/files/${original.list}/${file}`);

            // check if the file exists first
            ref.child("status").once('value')
            .then(snapshot => {
                if(snapshot.exists())
                    ref.update({status: "Given"}, err => {

                        // once an error occurs "files_updated" is set to FALSE
                        // the following if will stop
                        // the flag from being set to TRUE again
                        if(files_updated)
                            files_updated = (err === null);
                    });
                return 1;
            }).catch(err => console.log(err));            
        });
  
    if (original.devotee && files_updated)
        if(original.devotee.emailAddress) {
            let email = original.devotee.emailAddress;

            sendEmail(email, request, sendInBlueSecretKey);

            return snapshot.ref.child('mailSent').set("Sent");
        }
    
}