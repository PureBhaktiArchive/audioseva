import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import sendinBlue from 'nodemailer-sendinblue-transport';
import Email = require('email-templates');
import nodemailer = require('nodemailer');

const apiKey = functions.config().send_in_blue || '';
const transport = nodemailer.createTransport(sendinBlue({ apiKey }));
const email = new Email({ message: {}, transport });

export const sendNotificationEmail = functions.database
  .ref('/email/notifications/{pushId}')
  .onCreate(async snapshot => {
    const data = snapshot.val();

    if (data.sentTimestamp) return false;

    console.log(
      `Sending an email to ${data.to} with template "${data.template}"`
    );

    try {
      await email.send({
        template: data.template,
        message: {
          from: data.replyTo,
          to: data.to,
          bcc: data.bcc,
          replyTo: data.replyTo,
        },
        locals: data.params,
      });
    } catch (e) {
      console.error(e);
      return false;
    }

    await snapshot.ref.update({
      sentTimestamp: admin.database.ServerValue.TIMESTAMP,
    });

    return true;
  });
