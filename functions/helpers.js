
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


