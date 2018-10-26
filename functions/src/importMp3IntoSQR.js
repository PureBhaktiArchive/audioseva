
exports.handleNewUploads = (object, db, storeFileNameToDB) => {
    const filePath = object.name;
    
    storeFileNameToDB(filePath, db);

    return Promise.resolve(1);
}