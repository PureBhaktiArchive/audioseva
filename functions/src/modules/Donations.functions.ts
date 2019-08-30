/*
 * sri sri guru gauranga jayatah
 */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { Spreadsheet } from '../GoogleSheets';

export const processDonations = functions.database
  .ref('/donations/cash/{donation_id}')
  .onCreate(
    async (
      snapshot: functions.database.DataSnapshot,
      context: functions.EventContext
    ): Promise<any> => {
      const donation = snapshot.val();

      const sheet = await Spreadsheet.open(
        functions.config().donations.cash.spreadsheet.id,
        functions.config().donations.cash.spreadsheet.name
      );

      await sheet.appendRows([
        {
          Date: donation.date,
          Amount: donation.sum.amount,
          Currency: donation.sum.currency,
          'Donor Name': donation.donor.name,
          'Donor Phone Number': `'${donation.donor.phoneNumber}`,
          'Donor Email Address': donation.donor.emailAddress,
          'Collected By': donation.collectedBy,
          Comment: donation.comment,
        },
      ]);

      return admin
        .database()
        .ref(`/email/notifications`)
        .push({
          to: donation.donor.emailAddress,
          replyTo: functions.config().donations.contact.email_address,
          bcc: functions.config().donations.contact.email_address,
          template: 'donations-acknowledgement',
          params: {
            donation,
          },
        });
    }
  );
