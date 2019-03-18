import * as admin from 'firebase-admin';
import 'firebase-functions';

admin.initializeApp();

/*********************************************
 **
 **  ** Loads the Functions from their modules and then exports them **
 **      The resulting exports object will have multiple inner objects with each having
 **          KEY = file name
 **          VALUE = all the functions in the loaded file name
 **
 **      Example --> exports = { SQR: { updateFilesOnNewAllotment: [Function], ... } }
 **      On Cloud Fucntions this will appear as SQR-updateFilesOnNewAllotment
 **
 **********************************************/

import * as glob from 'glob';
const functionFiles = glob.sync('./modules/*.functions.js', { cwd: __dirname });

functionFiles.forEach((file: string) => {
  const moduleName = file
    .split('/')
    .pop()
    .split('.')
    .shift();
  if (
    !process.env.FUNCTION_NAME ||
    process.env.FUNCTION_NAME.startsWith(moduleName)
  ) {
    exports[moduleName] = require(file);
  }
});
