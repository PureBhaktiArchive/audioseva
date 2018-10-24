
exports.handleCurrentlyUploadedFiles = (response, bucket, db, callback) => {
    bucket.getFiles().then(files => {
        files.forEach(innerFilesObject => {
            innerFilesObject.forEach(file => {
                callback(file.name, db);
            })
        });

        return response.send(`All Mp3 file names were stored to the database`);
    }).catch(err => console.log(err));
}