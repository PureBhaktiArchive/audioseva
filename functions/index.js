
const functions = require('firebase-functions');
const admin = require("firebase-admin");

try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: functions.config().sqr.database_url,
        storageBucket: functions.config().sqr.storage_bucket
    });
} catch (err) { console.log(err) }

//
/*********************************************
**
**  ** Loads the Functions from their modules **
**      1. Iterates over all the files ending with '.functions.js' in the "src" directory
**      2. Extracts the file name and chops off the trailing '.functions.js'
**      3. Loads the file
**      4. Adds to the exports object a new object 
**          with the KEY = file name
**          and the VALUE = all the functions in the loaded file name
**
**      Example --> exports = { SQR: { updateFilesOnNewAllotment: [Function], ... } }
**
**********************************************/
const glob = require('glob');
const functionFiles = glob.sync('./src/*.functions.js', { cwd: __dirname });

functionFiles.forEach((file, index) => {
    const filename = file.split('/').pop().slice(0, -13); // remove the trailing ".functions.js"
    console.log(require(file));
    // exports[filename] = require(file);
});

