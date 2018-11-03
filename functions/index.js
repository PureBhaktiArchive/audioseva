
const functions = require('firebase-functions');
const admin = require("firebase-admin");
const adminConfig = JSON.parse(process.env.FIREBASE_CONFIG);

try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: adminConfig.databaseURL,
        storageBucket: adminConfig.storageBucket
    });
} catch (err) { console.log(err) }


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
**      On Cloud Fucntions this will appear as SQR-updateFilesOnNewAllotment
**
**********************************************/
const glob = require('glob');
const functionFiles = glob.sync('./src/*.functions.js', { cwd: __dirname });

functionFiles.forEach((file, index) => {
    const filename = file.split('/').pop().slice(0, -13); // remove the trailing ".functions.js"
    exports[filename] = require(file);
});
