/*
 * sri sri guru gauranga jayatah
 */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { Spreadsheet } from '../Spreadsheet';

export const processDonations = functions.database
  .ref('/donations/cash/{donation_id}')
  .onCreate(async (snapshot: functions.database.DataSnapshot) => {
    const donation = snapshot.val();

    const sheet = await Spreadsheet.open(
      functions.config().donations.cash.spreadsheet.id as string,
      functions.config().donations.cash.spreadsheet.name as string
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

    return admin.database().ref(`/email/notifications`).push({
      timestamp: admin.database.ServerValue.TIMESTAMP,
      to: donation.donor.emailAddress,
      bcc: functions.config().donations.contact.email_address,
      replyTo: functions.config().donations.contact.email_address,
      template: 'donations/acknowledgement',
      params: {
        donation,
      },
    });
  });
