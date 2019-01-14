import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as Google from 'googleapis';
import { Message } from 'firebase-functions/lib/providers/pubsub';

const db = admin.database();

/**
 * TODOS: need to figure how to refresh auth token per gmail account
 * 
 */

export const oauth2init = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    const { client_key, secret, redirect } = functions.config().gmail;
    const oauth2Client = new Google.google.auth.OAuth2(
      client_key,
      secret,
      redirect
    );
    const authURL = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.modify'],
    });
    res.redirect(authURL);
  }
);

const saveTokensInDatabase = async (values: any) => {
  const newGmailTokensRef = db.ref(`/gmail/${values.emailKey}`);
  newGmailTokensRef.set({
    oauth: {
      token: values.accessToken,
    },
    emailAddress: values.fullEmail,
  });
};

export const oauth2callback = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    const { client_key, secret, redirect } = functions.config().gmail;
    const oauth2Client = new Google.google.auth.OAuth2(
      client_key,
      secret,
      redirect
    );

    const { tokens } = await oauth2Client.getToken(req.query.code);
    oauth2Client.setCredentials(tokens);

    // Need to figure out how to get refresh token
    console.info('refresh tokens returned: ', tokens);
    console.info('auth credentials: ', oauth2Client.credentials);

    const gm = await Google.google.gmail({
      version: 'v1',
      auth: oauth2Client,
    });

    const profile = await gm.users.getProfile({ userId: 'me' });
    const emailAddressKey = profile.data.emailAddress
      .split('@')[0]
      .replace('.', '');

    await saveTokensInDatabase({
      emailKey: emailAddressKey,
      fullEmail: profile.data.emailAddress,
      accessToken: oauth2Client.credentials.access_token,
    });

    res.send({
      message: `${profile.data.emailAddress} token saved`,
    });
  }
);

const getEmailTokenFromDatabase = async (email: string) => {
  const emailKey = email.split('@')[0].replace('.', '');
  const queryResults = await db.ref(`/gmail/${emailKey}`).once('value');
  return queryResults.val();
};

const storeHistoryIdInDatabase = async (email: string, historyId: any) => {
  const emailKey = email.split('@')[0].replace('.', '');
  return await db.ref(`/gmail/${emailKey}`).update({
    lastSyncHistoryId: historyId,
  });
};

export const initWatch = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    // Initiate gmail client
    const { client_key, secret, redirect } = functions.config().gmail;
    const oauth2Client = new Google.google.auth.OAuth2(
      client_key,
      secret,
      redirect
    );

    // User email should come from client initiation
    const hardCodedEmail = 'audioseva.test@gmail.com';
    const { oauth, emailAddress } = await getEmailTokenFromDatabase(
      hardCodedEmail
    );

    oauth2Client.setCredentials({
      access_token: oauth.token,
    });
    const gm = await Google.google.gmail({
      version: 'v1',
      auth: oauth2Client,
    });

    try {
      // Make sure we have the correct labelId because GMail internally gives a random one that is
      // not based on the given name, so we need to filter it by the given name
      const labelResults = await gm.users.labels.list({
        userId: emailAddress,
      });
      const doneLabelObj = labelResults.data.labels.filter(label => {
        return label.name === 'SQRDone';
      })[0];

      const watchResults = await gm.users.watch({
        userId: 'me',
        requestBody: {
          labelIds: [doneLabelObj.id],
          topicName: 'projects/audio-seva-team-test/topics/gmail-labeled-done',
        },
      });

      if (watchResults.data && doneLabelObj) {
        // Store the most recent historyId
        await storeHistoryIdInDatabase(
          emailAddress,
          watchResults.data.historyId
        );
        res
          .status(200)
          .send(
            `Watch (${watchResults.data.historyId}) created on ${
              doneLabelObj.name
            }/${doneLabelObj.id} for ${emailAddress}`
          );
      } else {
        res
          .status(301)
          .send(`Something went wrong, check logs for Gmail-initWatch`);
      }
    } catch (err) {
      console.log('Error: ', err);
      res
        .status(301)
        .send(`Something went wrong, check logs for Gmail-initWatch`);
    }
  }
);

export const gmailDoneHandler = functions.pubsub
  .topic('gmail-labeled-done')
  .onPublish(async (message: Message) => {
    const decodedMessage = JSON.parse(
      Buffer.from(message.data, 'base64').toString('ascii')
    );

    // Gmail client and authenticate
    const { client_key, secret, redirect } = functions.config().gmail;
    const oauth2Client = new Google.google.auth.OAuth2(
      client_key,
      secret,
      redirect
    );
    const { oauth, lastSyncHistoryId } = await getEmailTokenFromDatabase(
      decodedMessage.emailAddress || 'audioseva.test@gmail.com'
    );
    oauth2Client.setCredentials({
      access_token: oauth.token,
    });
    const gm = await Google.google.gmail({
      version: 'v1',
      auth: oauth2Client,
    });

    const labelResults = await gm.users.labels.list({
      userId: 'me',
    });
    const doneLabelObj = labelResults.data.labels.filter(label => {
      return label.name === 'SQRDone';
    })[0];

    try {
      // Typescript complains if not initialized and casted to any
      const historyListRequest: any = {
        userId: decodedMessage.emailAddress || 'me',
        startHistoryId: lastSyncHistoryId,
        historyTypes: 'labelAdded',
        labelId: [doneLabelObj.id],
      };

      // Call the history list api to fetch changes since last synced
      const results = await gm.users.history.list(historyListRequest);
      if (!results.data.history || !results.data.history.length) {
        // Handle empty history, and update history id
        await storeHistoryIdInDatabase(
          decodedMessage.emailAddress,
          decodedMessage.historyId
        );
        throw new Error('History is empty. Nothing to process');
      }

      const onlyLabelAdded = results.data.history.filter(change => {
        return change.labelsAdded;
      });

      // We only care about the final state of the Done label whether it was applied
      // or not, so we get rid of the duplicates incase there are any
      const uniques = {};
      onlyLabelAdded.forEach(change => {
        change.labelsAdded.forEach(obj => {
          uniques[obj.message.id] = {
            labels: obj.labelIds,
            threadId: obj.message.threadId,
          };
        });
      });

      // Call the gmail.users.threads api with the unique changes
      // and retrieve list of threads and messages
      const threadHeaders = Object.keys(uniques).map(async threadKey => {
        const threadResults = await gm.users.threads.get({
          userId: 'me',
          id: uniques[threadKey].threadId,
        });
        // Only care about the first message headers in the thread
        return threadResults.data.messages[0].payload.headers;
      });
      const allResults = await Promise.all(threadHeaders);
      // Filter the subject header out from the response
      const subjectParts = allResults.map(thread => {
        const subjectValue = thread.filter(
          header => header.name === 'Subject'
        )[0].value;
        if (subjectValue) {
          const p = subjectValue.split(' - ');
          return { no: p[0], fileName: p[1], person: p[2] };
        }
        return null;
      });

      subjectParts.forEach(async subjectPart => {
        const list = subjectPart.fileName.split('-')[0];
        const Ref = db.ref(
          `files/${list}/${subjectPart.fileName}/soundQualityReporting`
        );
        const sqrResults = await Ref.once('value');
        if (sqrResults.exists()) {
          Ref.update({
            status: 'Done',
            timestampDone: Date.now() / 1000,
          });
        }
      });

      // If everything goes well, store the new history id for next sync
      await storeHistoryIdInDatabase(
        decodedMessage.emailAddress,
        decodedMessage.historyId
      );
    } catch (error) {
      console.log('Error: ', error);
    }
  });
