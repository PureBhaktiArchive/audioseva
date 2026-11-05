import * as functions from 'firebase-functions/v1';
import { DateTime } from 'luxon';
import Email = require('email-templates');
import admin = require('firebase-admin');
import {
  emailSenderName,
  emailSenderAddress,
  projectDomain,
  emailConnection,
} from '../params';

function getEmail() {
  return new Email({
    message: {
      from: {
        name: emailSenderName.value(),
        address: emailSenderAddress.value(),
      },
    },
    transport: emailConnection.value(),
  });
}

async function sendNotificationEmailSnapshot(
  snapshot: admin.database.DataSnapshot
) {
  const data = snapshot.val();

  if (data.sentTimestamp) return;

  if ((data.timestamp || 0) < Date.now() - 604800 * 1000) {
    console.log(`Skipping outdated email ${snapshot.key}.`);
    return;
  }

  console.log(
    `Sending email ${snapshot.key} to ${data.to} with template "${data.template}" and params`,
    data.params
  );

  if (process.env.FUNCTIONS_EMULATOR) return;

  await getEmail().send({
    template: data.template,
    message: {
      to: data.to,
      bcc: data.bcc,
      replyTo: data.replyTo,
    },
    locals: {
      settings: {
        project: {
          domain: projectDomain.value(),
        },
      },
      DateTime,
      ...data.params,
    },
  });

  await snapshot.ref.update({
    sentTimestamp: admin.database.ServerValue.TIMESTAMP,
  });
}

export const sendNotificationEmail = functions
  .runWith({ secrets: [emailConnection] })
  .database.ref('/email/notifications/{pushId}')
  .onCreate(async (snapshot) => {
    await sendNotificationEmailSnapshot(snapshot);
  });

export const retryFailedEmails = functions
  .runWith({ secrets: [emailConnection] })
  .pubsub.schedule('every day 09:00')
  .timeZone(process.env.COORDINATOR_TIMEZONE || '')
  .onRun(async () => {
    const failedNotifications = await admin
      .database()
      .ref('/email/notifications/')
      .orderByChild('sentTimestamp')
      .equalTo(null)
      .once('value');

    console.log(
      `Found ${failedNotifications.numChildren()} not sent notifications.`
    );

    const keys = Object.keys(failedNotifications.val() as unknown);
    for (const key of keys) {
      await sendNotificationEmailSnapshot(failedNotifications.child(key)).catch(
        (reason) => console.warn(reason)
      );
    }
  });
