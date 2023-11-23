import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import Email = require('email-templates');
import admin = require('firebase-admin');

const email = new Email({
  message: {
    from: functions.config().email.sender,
  },
  transport: functions.config().email.connection,
});

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

  await email.send({
    template: data.template,
    message: {
      to: data.to,
      bcc: data.bcc,
      replyTo: data.replyTo,
    },
    locals: {
      settings: {
        project: {
          domain: functions.config().project.domain,
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

export const sendNotificationEmail = functions.database
  .ref('/email/notifications/{pushId}')
  .onCreate(async (snapshot) => {
    await sendNotificationEmailSnapshot(snapshot);
  });

export const retryFailedEmails = functions.pubsub
  .schedule('every day 09:00')
  .timeZone(functions.config().coordinator.timezone as string)
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
