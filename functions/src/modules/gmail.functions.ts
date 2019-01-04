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
    "614669175345-6lsbit5ksndninnfpiti52f6tpfn538s.apps.googleusercontent.com",
    "esgLuN0kJLIK9MAK7piwcGzy",
    redirect);
    
  const authURL = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
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
    "614669175345-6lsbit5ksndninnfpiti52f6tpfn538s.apps.googleusercontent.com",
    "esgLuN0kJLIK9MAK7piwcGzy",
    redirect);
  
  const { tokens } = await oauth2Client.getToken(req.query.code);
  oauth2Client.setCredentials(tokens);
  
  const gmail = await Google.google.gmail({
    version: "v1",
    auth: oauth2Client,
  });

  const profile = await gmail.users.getProfile({ userId: "me" });

  await saveTokensInDatabase({
    emailAddress: profile.data.emailAddress,
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
 * Make gmail account labels subscribe to our pubsub channel, "gmail-done"
 */
export const initWatch = functions.https.onRequest(
async (req: functions.Request, res: functions.Response) => {

  // Fetch token from database (Requires email address from client)


  // Call gmail.users.watch api


  // Return response

});

const saveTokensInDatabase = async (obj: any) => {
  console.log("Should store these tokens somehow: ", obj);
  const gmailTokensRef = db.ref(`/gmail/token`);
  return await gmailTokensRef.push(obj);
}

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