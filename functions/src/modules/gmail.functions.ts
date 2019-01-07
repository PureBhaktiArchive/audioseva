import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as Google from "googleapis";
import { Message } from 'firebase-functions/lib/providers/pubsub';
import { gmail } from 'googleapis/build/src/apis/gmail';

const db = admin.database();

class GoogleMail {
  constructor() {
    // connection
  }


}

/**
 * Authenticate and give permissions, then redirect to redirect endpoint
 * 
 */
export const oauth2init = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
  const { client_key, secret, redirect } = functions.config().gmail;
  const oauth2Client = new Google.google.auth.OAuth2(
    client_key,
    secret,
    redirect);
  const authURL = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.modify"],
  });
  
  console.log("url: ", authURL);
  res.redirect(authURL);
});

/**
 * After authentication redirects here with token, store the token somewhere
 * 
 */
export const oauth2callback = functions.https.onRequest(
async (req: functions.Request, res: functions.Response) => {
  const { client_key, secret, redirect } = functions.config().gmail;
  const oauth2Client = new Google.google.auth.OAuth2(
    client_key,
    secret,
    redirect);
  
  const { tokens } = await oauth2Client.getToken(req.query.code);
  oauth2Client.setCredentials(tokens);
  
  const gm = await Google.google.gmail({
    version: "v1",
    auth: oauth2Client,
  });

  const profile = await gm.users.getProfile({ userId: "me" });

  await saveTokensInDatabase({
    email: profile.data.emailAddress,
    accessToken: oauth2Client.credentials.access_token
  });

  // https://www.googleapis.com/oauth2/v1/userinfo?access_token={accessToken}
  // Store token in some storage
  // const resultsOfSave = await saveTokensInDatabase(tokens);

  // Subscribe for pubsub

  res.send({
    message: `${profile.data.emailAddress} token saved`,
  });
});

/**
 * Store auth tokens with email address
 * @param obj Values to save along with token
 */
const saveTokensInDatabase = async (values: any) => {
  console.log("Store object values: ", values);
  const newGmailTokensRef = db.ref(`/gmail`);
  newGmailTokensRef.push({
    oauth: {
      token: values.accessToken
    },
    emailAddress: values.email,
  });
  // return await gmailTokensRef.push(obj);
}

/**
 * Make gmail account labels subscribe to our pubsub channel, "gmail-done"
 */
export const initWatch = functions.https.onRequest(
async (req: functions.Request, res: functions.Response) => {

  // Fetch token from database (Requires email address from client)


  // Call gmail.users.watch api


  // Return response

});

/**
 * Receive gmail watch push from gcp pubsub, and modify our database
 * 
 */
// export const gmailDoneTrigger = functions.pubsub.topic('gmail-labeled-done')
// .onPublish((message: Message) => {
//   console.log("gmail done: ", message);
// });

// https://us-central1-audio-seva-team-test.cloudfunctions.net/Gmail-gmailRedirectUrl
// LastToken=4/yAAL1SEwU7TQQkYCYCvvO3Bf73r0BjayKU4gWveQKDZ_--_zW1wwCoNCkAP6Nlwmc5PN4MC1Ty7v0MEG-RuIlTc