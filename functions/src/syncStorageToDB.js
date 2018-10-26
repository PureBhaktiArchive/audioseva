
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
