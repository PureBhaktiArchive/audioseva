import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import GoogleSheet from '../services/GoogleSheets';
import { DataSnapshot } from 'firebase-functions/lib/providers/database';
import { withDefault } from '../utils/parsers';

const db = admin.database();

export const importUserRegistrationData = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    const spreadsheetId: string =
      '1dpGOD0IWFcwzXLjXNFXehsnqYtok5aqOWJHbLwXboIs';
    const gsheets: GoogleSheet = new GoogleSheet(
      spreadsheetId,
      'Registrations'
    );

    const registrationRows = await gsheets.getRows();

    const readyForDatabaseUpdate = registrationRows.map((elem: any) => {
      console.log('elem: ', elem['Languages']);
      return {
        notes: withDefault(elem['Details']),
        status: elem['Status'],
        timestamp: new Date(elem['Timestamp']).getTime() / 1000,
        name: elem['Name'],
        location: elem['Country'],
        emailAddress: elem['Email Address'],
        phoneNumber: elem['Phone Number'],
        whatsApp: elem['WhatsApp'],
        languages: elem['Languages'].split(', '),
        services: elem['Services'],
        roles: {
          CR: elem['CR'] === 'Yes',
          FC: elem['FC'] === 'Yes',
          QC: elem['QC'] === 'Yes',
          TE: elem['TE'] === 'Yes',
          SE: elem['SE'] === 'Yes',
          SQR: elem['SQR'] === 'Yes',
        },
        experience: elem['Experience'],
        influencer: elem['Influencer'],
        recommendedBy: elem['Recommended By'],
      };
    });

    await readyForDatabaseUpdate.forEach(async (spreadsheetRecord: any) => {
      const Users = db.ref('/users');
      await Users.orderByChild('emailAddress')
        .equalTo(spreadsheetRecord['emailAddress'])
        .once('value', async (snapshot: DataSnapshot) => {
          if (snapshot.exists() === false) {
            // No such email exist, create new record
            await Users.push(spreadsheetRecord);
          }
        });
    });

    res.status(200).end();
  }
);
