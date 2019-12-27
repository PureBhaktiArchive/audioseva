import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import sendinBlue from 'nodemailer-sendinblue-transport';
import EmailEngine = require('email-templates');
import nodemailer = require('nodemailer');

const apiKey = functions.config().send_in_blue || '';
const transport = nodemailer.createTransport(sendinBlue({ apiKey }));
const engine = new EmailEngine({ message: {}, transport });

export const sendNotificationEmail = functions.database
  .ref('/email/notifications/{pushId}')
  .onCreate(async snapshot => {
    const data = snapshot.val();

    if (data.sentTimestamp) return false;

    console.log(
      `Sending an email to ${data.to} with template "${data.template}"`
    );

    try {
      await engine.send({
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
    } catch (e) {
      console.error(e);
      return Promise.reject(e);
    }

    await snapshot.ref.update({
      sentTimestamp: admin.database.ServerValue.TIMESTAMP,
    });

    return true;
  });
