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

export const sendNotificationEmail = functions.database
  .ref('/email/notifications/{pushId}')
  .onCreate(async (snapshot, { params }) => {
    const data = snapshot.val();

    if (data.sentTimestamp) return;

    console.log(
      `Sending email ${params.pushId} to ${data.to} with template "${data.template}"`
    );

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
        date: DateTime.local().toFormat('dd.MM'),
        ...data.params,
      },
    });

    await snapshot.ref.update({
      sentTimestamp: admin.database.ServerValue.TIMESTAMP,
    });
  });
