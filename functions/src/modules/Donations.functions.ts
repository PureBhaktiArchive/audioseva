/*
 * sri sri guru gauranga jayatah
 */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { Spreadsheet } from '../Spreadsheet';
import {
  donationsCashSpreadsheetId,
  donationsCashSpreadsheetName,
  donationsContactEmailAddress,
} from '../params';

export const processDonations = functions.database
  .ref('/donations/cash/{donation_id}')
  .onCreate(async (snapshot: functions.database.DataSnapshot) => {
    const donation = snapshot.val();

    const sheet = await Spreadsheet.open(
      donationsCashSpreadsheetId.value(),
      donationsCashSpreadsheetName.value()
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
      bcc: donationsContactEmailAddress.value(),
      replyTo: donationsContactEmailAddress.value(),
      template: 'donations/acknowledgement',
      params: {
        donation,
      },
    });
  });
