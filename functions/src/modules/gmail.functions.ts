import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as Google from 'googleapis';
import { Message } from 'firebase-functions/lib/providers/pubsub';
import * as SQR from './SQR.functions';
import * as moment from 'moment';

const db = admin.database();

const { client_key, secret } = functions.config().oauth;
const oauth2Client = new Google.google.auth.OAuth2(client_key, secret);
const DONE_LABEL = 'gmail-labeled-done';

export const oauth2init = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    const functionsURL = `https://${req.headers.host}/Gmail-oauth2callback`;
    const client = new Google.google.auth.OAuth2(
      client_key,
      secret,
      functionsURL
    );
    const authURL = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
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
    const functionsURL = `https://${req.headers.host}/Gmail-oauth2callback`;
    const oauth2ClientWithRedirect = new Google.google.auth.OAuth2(
      client_key,
      secret,
      functionsURL
    );

    const { tokens } = await oauth2ClientWithRedirect.getToken(req.query.code);
    await saveTokens(tokens);
    res.send('Ok');
  }
);

const fetchToken = async () => {
  const queryResults = await db.ref(`/gmail/coordinator/oauth`).once('value');
  const oauth = queryResults.val();

  // https://github.com/GoogleCloudPlatform/cloud-functions-gmail-nodejs/blob/master/lib/oauth.js#L62
  // https://github.com/googleapis/google-auth-library-nodejs/releases/tag/v2.0.0
  if (
    !oauth.expiry_date ||
    // moment().valueOf() = Unix timestamp in milliseconds + 1 minute
    oauth.expiry_date < moment().valueOf() + 60000
  ) {
    oauth2Client.credentials.refresh_token =
      oauth2Client.credentials.refresh_token || oauth.refresh_token;
    const result = await oauth2Client.getAccessToken();
    await saveTokens(result.res.data);
    return result.res.data;
  }
  return oauth;
};

const fetchHistorySyncId = async () => {
  const queryResults = await db
    .ref(`/gmail/coordinator/lastSyncHistoryId`)
    .once('value');
  return queryResults.val();
};

const storeHistoryIdInDatabase = async (historyId: any) => {
  return await db.ref(`/gmail/coordinator`).update({
    lastSyncHistoryId: historyId,
  });
};

const saveLabelId = (labelId: string) => {
  const newGmailTokensRef = db.ref(`/gmail/coordinator`);
  newGmailTokensRef.update({
    labelId,
  });
};

// Fetch labelId from database if exists if not fetch from API and save in database
const fetchLabelId = async (): Promise<string> => {
  const result = await db.ref(`/gmail/coordinator/labelId`).once('value');
  let labelId = result.val();

  if (!labelId) {
    const oauth = await fetchToken();
    oauth2Client.setCredentials({
      access_token: oauth.access_token,
      refresh_token: oauth.refresh_token,
    });
    const gmailClient = await Google.google.gmail({
      version: 'v1',
      auth: oauth2Client,
    });

    const labelResults = await gmailClient.users.labels.list({ userId: 'me' });
    labelId = labelResults.data.labels.filter(label => {
      return label.name === functions.config().coordinator.gmail.done.name;
    })[0].id;
    saveLabelId(labelId);
  }

  return labelId;
};

export const initWatch = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    // Initiate gmail client
    const oauth = await fetchToken();
    oauth2Client.setCredentials({
      access_token: oauth.access_token,
      refresh_token: oauth.refresh_token,
    });
    const gmail = await Google.google.gmail({
      version: 'v1',
      auth: oauth2Client,
    });

    try {
      const labelId: string = await fetchLabelId();
      const watchResults = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          labelIds: [labelId],
          topicName: `projects/${
            process.env.GCLOUD_PROJECT
          }/topics/${DONE_LABEL}`,
        },
      });

      if (!watchResults.data || !labelId) {
        throw new Error('Empty watch results data or label id');
      }

      // Store the most recent historyId
      await storeHistoryIdInDatabase(watchResults.data.historyId);
      return res
        .status(200)
        .send(`Watch (${watchResults.data.historyId}) created`);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .send(`Something went wrong, check logs for Gmail-initWatch`);
    }
  }
);

export const processMarkingSubmissionAsDone = functions.pubsub
  .topic(DONE_LABEL)
  .onPublish(async (message: Message) => {
    const decodedMessage = JSON.parse(
      Buffer.from(message.data, 'base64').toString('ascii')
    );
    const oauth = await fetchToken();
    const lastSyncHistoryId = await fetchHistorySyncId();

    oauth2Client.setCredentials({
      access_token: oauth.access_token,
      refresh_token: oauth.refresh_token,
    });
    const gmail = await Google.google.gmail({
      version: 'v1',
      auth: oauth2Client,
    });

    const labelId: string = await fetchLabelId();
    try {
      // Typescript complains if not initialized and casted to any
      const historyListRequest: any = {
        userId: 'me',
        startHistoryId: lastSyncHistoryId,
        historyTypes: 'labelAdded',
        labelId: [labelId],
      };

      // Call the history list api to fetch changes since last synced
      const results = await gmail.users.history.list(historyListRequest);
      if (!results.data.history || !results.data.history.length) {
        // Handle empty history, and update history id, then end the function
        await storeHistoryIdInDatabase(decodedMessage.historyId);
        console.info('History is empty, nothing to process');
        return;
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
        console.info('History is empty, nothing to process');
        return;
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
          await SQR.processMarkingSubmissionAsDone(processObject);
        }
        // Add handle other module processes if statements
      });
      await storeHistoryIdInDatabase(decodedMessage.historyId);
    } catch (error) {
      console.error(error);
    }
  });
