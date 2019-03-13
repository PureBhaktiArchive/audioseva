import * as admin from 'firebase-admin';
import 'firebase-functions';
const adminConfig = JSON.parse(process.env.FIREBASE_CONFIG);

try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: adminConfig.databaseURL,
    storageBucket: adminConfig.storageBucket,
  });
} catch (err) {
  console.log(err);
}

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
import * as CR from './modules/CR.functions';
import * as SQR from './modules/SQR.functions';
import * as Files from './modules/Files.functions';
import * as Email from './modules/Email.functions';
import * as SE from './modules/SE.functions';
import * as User from './modules/User.functions';
import * as Donations from './modules/Donations.functions';

export { CR, SQR, Files, Email, SE, User, Donations };
