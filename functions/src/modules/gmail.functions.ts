import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as Google from 'googleapis';
import { Message } from 'firebase-functions/lib/providers/pubsub';
import { processSQRDoneFromGmail } from './SQR.functions';

const db = admin.database();

const { client_key, secret, redirect } = functions.config().gmail;
const oauth2Client = new Google.google.auth.OAuth2(
  client_key,
  secret,
  redirect
);

export const oauth2init = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {

    console.log("hostname: ", req.hostname);
    const authURL = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/gmail.modify'],
      login_hint: functions.config().coordinator.gmail.account,
    });
    res.redirect(authURL);
  }
);

const saveTokens = async (values: any) => {
  const newGmailTokensRef = db.ref(`/gmail/coordinator/oauth`);
  newGmailTokensRef.set(values);
};

export const oauth2callback = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    oauth2Client.setCredentials(tokens);

    await saveTokens({
      token: tokens.access_token,
      refresh: tokens.refresh_token,
      expiry: tokens.expiry_date,
    });

    res.send('Ok');
  }
);

const fetchToken = async () => {
  const queryResults = await db.ref(`/gmail/coordinator`).once('value');
  const values = queryResults.val();
  // https://github.com/GoogleCloudPlatform/cloud-functions-gmail-nodejs/blob/master/lib/oauth.js#L62
  // https://github.com/googleapis/google-auth-library-nodejs/releases/tag/v2.0.0
  if (false || !values.oauth.expiry_date || values.oauth.expiry_date < Date.now() + 60000) {
    oauth2Client.credentials.refresh_token = oauth2Client.credentials.refresh_token || values.oauth.refresh_token;
    const result = await oauth2Client.getAccessToken();
    await saveTokens(result.res.data);
    return {
      ...values,
      oauth: result.res.data,
    }
  }
  return values;
};

const storeHistoryIdInDatabase = async (historyId: any) => {
  return await db.ref(`/gmail/coordinator`).update({
    lastSyncHistoryId: historyId,
  });
};

export const initWatch = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    // Initiate gmail client
    const { oauth } = await fetchToken();
    oauth2Client.setCredentials({
      access_token: oauth.access_token,
      refresh_token: oauth.refresh_token,
    });
    const gmail = await Google.google.gmail({
      version: 'v1',
      auth: oauth2Client,
    });

    try {
      // Make sure we have the correct labelId because GMail internally gives a random one that is
      // not based on the given name, so we need to filter it by the given name
      const labelResults = await gmail.users.labels.list({
        userId: 'me',
      });
      const doneLabelObj = labelResults.data.labels.filter(label => {
        return label.name === 'SQRDone';
      })[0];

      const watchResults = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          labelIds: [doneLabelObj.id],
          topicName: 'projects/audio-seva-team-test/topics/gmail-labeled-done',
        },
      });

      if (watchResults.data && doneLabelObj) {
        // Store the most recent historyId
        await storeHistoryIdInDatabase(watchResults.data.historyId);
        return res
          .status(200)
          .send(
            `Watch (${watchResults.data.historyId}) created on ${
              doneLabelObj.name
            }/${doneLabelObj.id} for coordinator`
          );
      } else {
        return res
          .status(301)
          .send(`Something went wrong, check logs for Gmail-initWatch`);
      }
    } catch (err) {
      console.error(err);
      return res
        .status(301)
        .send(`Something went wrong, check logs for Gmail-initWatch`);
    }
  }
);

export const doneHandler = functions.pubsub
  .topic('gmail-labeled-done')
  .onPublish(async (message: Message) => {
    const decodedMessage = JSON.parse(
      Buffer.from(message.data, 'base64').toString('ascii')
    );
    const { oauth, lastSyncHistoryId } = await fetchToken();
    console.log("oauthTokenHere: ", oauth);

    oauth2Client.setCredentials({
      access_token: oauth.access_token,
      refresh_token: oauth.refresh_token,
    });
    const gmail = await Google.google.gmail({
      version: 'v1',
      auth: oauth2Client,
    });

    /**
     * Just implemented refresh access tokens in fetchTokens()
     * need to test in production to make sure is working or not
     * maybe some more refactoring needs to be done as well
     */

    const labelResults = await gmail.users.labels.list({
      userId: 'me',
    });
    const doneLabelObj = labelResults.data.labels.filter(label => {
      return label.name === 'SQRDone';
    })[0];

    try {
      // Typescript complains if not initialized and casted to any
      const historyListRequest: any = {
        userId: 'me',
        startHistoryId: lastSyncHistoryId,
        historyTypes: 'labelAdded',
        labelId: [doneLabelObj.id],
      };

      // Call the history list api to fetch changes since last synced
      const results = await gmail.users.history.list(historyListRequest);
      if (!results.data.history || !results.data.history.length) {
        // Handle empty history, and update history id
        await storeHistoryIdInDatabase(decodedMessage.historyId);
        throw new Error('History is empty. Nothing to process');
      }

      const onlyUniqueLabelsAdded = results.data.history.filter(change => {
        return change.labelsAdded;
      })
      // Get the first message of a thread that has labels added, and get uniques threadIds[]
      .map(change => change.labelsAdded[0].message.threadId)
      .filter((threadId, index, array) => array.indexOf(threadId) === index);

      if (!onlyUniqueLabelsAdded || !onlyUniqueLabelsAdded.length) {
        await storeHistoryIdInDatabase(decodedMessage.historyId);
        throw new Error('History is empty. Nothing to process');
      }

      console.log("onlyUniqueLabelsAdded: ", onlyUniqueLabelsAdded);

      const allThreadsRequest = onlyUniqueLabelsAdded.map(threadId => {
        const threadResults = gmail.users.threads.get({
          userId: 'me',
          id: threadId
        });
        return threadResults; // Promise
      });

      const allThreadsResults = await Promise.all(allThreadsRequest);
      // Get first message of a thread
      const allThreadsData = allThreadsResults.map(result => {
        let fileName = "";
        let subject = "";
        result.data.messages[0].payload.headers.forEach(header => {
          if (header.name === "X-Audio-Seva-File-Name") {
            fileName = header.value;
          }
          if (header.name === "Subject") {
            subject = header.value;
          }
        });
        return {
          lastThreadMessageTimestamp: result.data.messages[result.data.messages.length - 1].internalDate,
          fileName,
          subject,
        }
      });
      console.log("allThreadsResults: ", allThreadsData);
      // Mock filename so we have something to process
      allThreadsData[0].fileName = "ML2-68 B";

      allThreadsData.forEach(async (processObject: any) => {
        if (processObject.fileName && processObject.subject.indexOf("SQR") > -1) {
          await processSQRDoneFromGmail(processObject);
        }
        // Handle other module processes
      });
      await storeHistoryIdInDatabase(decodedMessage.historyId);
    } catch (error) {
      console.error(error);
    }
  });
