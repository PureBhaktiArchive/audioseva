import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as Google from 'googleapis';
import { Message } from 'firebase-functions/lib/providers/pubsub';
import { processSQRDoneFromGmail } from './SQR.functions';
import * as moment from 'moment';

const db = admin.database();

const { client_key, secret } = functions.config().gmail;
const oauth2Client = new Google.google.auth.OAuth2(
  client_key,
  secret,
  'https://us-central1-audio-seva-team-test.cloudfunctions.net/Gmail-oauth2callback'
);

export const oauth2init = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
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
    await saveTokens(tokens);
    res.send('Ok');
  }
);

const fetchToken = async () => {
  const queryResults = await db.ref(`/gmail/coordinator`).once('value');
  const values = queryResults.val();

  // https://github.com/GoogleCloudPlatform/cloud-functions-gmail-nodejs/blob/master/lib/oauth.js#L62
  // https://github.com/googleapis/google-auth-library-nodejs/releases/tag/v2.0.0
  if (
    !values.oauth.expiry_date ||
    // moment().valueOf() = Unix timestamp in milliseconds + 1 minute
    values.oauth.expiry_date < moment().valueOf() + 60000
  ) {
    oauth2Client.credentials.refresh_token =
      oauth2Client.credentials.refresh_token || values.oauth.refresh_token;
    const result = await oauth2Client.getAccessToken();
    await saveTokens(result.res.data);
    return {
      ...values,
      oauth: result.res.data,
    };
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
        return label.name === 'Done';
      })[0];

      const watchResults = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          labelIds: [doneLabelObj.id],
          topicName: `projects/${process.env.GCLOUD_PROJECT}/topics/gmail-labeled-done`,
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
    } catch (error) {
      console.error(error);
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

    oauth2Client.setCredentials({
      access_token: oauth.access_token,
      refresh_token: oauth.refresh_token,
    });
    const gmail = await Google.google.gmail({
      version: 'v1',
      auth: oauth2Client,
    });

    const labelResults = await gmail.users.labels.list({
      userId: 'me',
    });
    const doneLabelObj = labelResults.data.labels.filter(label => {
      return label.name === 'Done';
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

      const onlyUniqueLabelsAdded = results.data.history
        .filter(change => {
          return change.labelsAdded;
        })
        // Get the first message of a thread that has labels added, and get uniques threadIds[]
        .map(change => change.labelsAdded[0].message.threadId)
        .filter((threadId, index, array) => array.indexOf(threadId) === index);

      if (!onlyUniqueLabelsAdded || !onlyUniqueLabelsAdded.length) {
        await storeHistoryIdInDatabase(decodedMessage.historyId);
        throw new Error('History is empty. Nothing to process');
      }

      const allThreadsRequest = onlyUniqueLabelsAdded.map(threadId => {
        const threadResults = gmail.users.threads.get({
          userId: 'me',
          id: threadId,
        });
        return threadResults; // Promise
      });

      const allThreadsResults = await Promise.all(allThreadsRequest);
      // Get first message of a thread
      const allThreadsData = allThreadsResults.map(result => {
        let fileName = '';
        let subject = '';
        result.data.messages[0].payload.headers.forEach(header => {
          if (header.name === 'X-Audio-Seva-File-Name') {
            fileName = header.value;
          }
          if (header.name === 'Subject') {
            subject = header.value;
          }
        });
        return {
          lastThreadMessageTimestamp:
            result.data.messages[result.data.messages.length - 1].internalDate,
          fileName,
          subject,
        };
      });

      allThreadsData.forEach(async (processObject: any) => {
        if (processObject.fileName && processObject.subject.match(/SQR/g)) {
          await processSQRDoneFromGmail(processObject);
        }
        // Add handle other module processes if statements
      });
      await storeHistoryIdInDatabase(decodedMessage.historyId);
    } catch (error) {
      console.error(error);
    }
  });
