
exports.handleNewUploads = (object, db, callback) => {
    const filePath = object.name;
    
    callback(filePath, db);

    return Promise.resolve(1);
}