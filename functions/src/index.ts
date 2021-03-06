/*!
 * sri sri guru gauranga jayatah
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import 'firebase-functions/lib/logger/compat';
import * as glob from 'glob';
import { Settings as DateTimeSettings } from 'luxon';

admin.initializeApp();

DateTimeSettings.defaultZoneName = functions.config().coordinator.timezone;

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

const functionFiles = glob.sync('./**/*.functions.js', { cwd: __dirname });

functionFiles.forEach((file: string) => {
  const moduleName = file.split('/').pop().split('.').shift();
  // See https://cloud.google.com/functions/docs/env-var#nodejs_10_and_subsequent_runtimes
  const functionName = process.env.FUNCTION_NAME || process.env.K_SERVICE;
  if (!functionName || functionName.startsWith(moduleName)) {
    exports[moduleName] = require(file);
  }
});
