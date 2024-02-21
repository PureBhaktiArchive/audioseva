/*!
 * sri sri guru gauranga jayatah
 */

import { initializeApp } from 'firebase-admin/app';
import { TaskQueue } from 'firebase-admin/functions';
import * as functions from 'firebase-functions';
// https://github.com/firebase/firebase-functions/issues/1351
import 'firebase-functions/logger/compat';
import { globSync } from 'glob';
import { Settings as DateTimeSettings } from 'luxon';
import * as path from 'path';

initializeApp();

/**
 * Emulator doesn't support Cloud Tasks functions today.
 * There isn't a "Google Cloud Task Emulator" that's hooked up to the Firebase Emulator Suite.
 * Patching the Task Queue class when in the functions emulator.
 * Inspired by https://github.com/firebase/firebase-tools/issues/4884#issuecomment-1457643321
 */
if (process.env.FUNCTIONS_EMULATOR) {
  Object.assign(TaskQueue.prototype, {
    enqueue: function (data: unknown, params: unknown) {
      return console.debug('Enqueued:', data, params);
    },
  });
}

DateTimeSettings.defaultZone = functions.config().coordinator.timezone;

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

const functionFiles = globSync('./**/*.functions.js', {
  cwd: __dirname,
  dotRelative: true,
  posix: true,
});

functionFiles.forEach((file: string) => {
  const moduleName = path.basename(file).split('.').shift();
  // See https://cloud.google.com/functions/docs/env-var#nodejs_10_and_subsequent_runtimes
  const functionName = process.env.FUNCTION_NAME || process.env.K_SERVICE;
  if (!functionName || functionName.startsWith(moduleName)) {
    exports[moduleName] = require(file);
  }
});
