import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import Email = require('email-templates');
import sendinBlue = require('nodemailer-sendinblue-transport');
import admin = require('firebase-admin');

const email = new Email({
  transport: sendinBlue({ apiKey: functions.config().send_in_blue || '' }),
});

export const sendNotificationEmail = functions.database
  .ref('/email/notifications/{pushId}')
  .onCreate(async snapshot => {
    const data = snapshot.val();

    if (data.sentTimestamp) return;

    console.log(
      `Sending an email to ${data.to} with template "${data.template}"`
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
