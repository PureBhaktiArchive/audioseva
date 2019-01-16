import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import GoogleSheet from '../services/GoogleSheets';
import { withDefault } from '../utils/parsers';

const db = admin.database();

enum RegistrationColumns {
  Details = 'Details',
  Status = 'Status',
  Timestamp = 'Timestamp',
  Name = 'Name',
  Country = 'Country',
  EmailAddress = 'Email Address',
  PhoneNumber = 'Phone Number',
  WhatsApp = 'WhatsApp',
  Languages = 'Languages',
  Services = 'Services',
  Experience = 'Experience',
  Influencer = 'Influencer',
  RecommendedBy = 'Recommended By',
}

enum Roles {
  CR = 'CR',
  FC = 'FC',
  QC = 'QC',
  TE = 'TE',
  SE = 'SE',
  SQR = 'SQR',
}

enum Decision {
  Yes = 'Yes',
  No = 'No',
}

export const importUserRegistrationData = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    const gsheets: GoogleSheet = new GoogleSheet(
      functions.config().user.spreadsheet_id,
      'Registrations'
    );

    const registrationRows = await gsheets.getRows();

    const readyForDatabaseUpdate = registrationRows.map((elem: any) => {
      return {
        notes: withDefault(elem[RegistrationColumns.Details]),
        status: elem[RegistrationColumns.Status],
        timestamp:
          new Date(elem[RegistrationColumns.Timestamp]).getTime() / 1000,
        name: elem[RegistrationColumns.Name],
        location: elem[RegistrationColumns.Country],
        emailAddress: elem[RegistrationColumns.EmailAddress],
        phoneNumber: elem[RegistrationColumns.PhoneNumber],
        isAvailableOnWhatsApp: elem[RegistrationColumns.WhatsApp],
        languages: elem[RegistrationColumns.Languages].split(', '),
        services: elem[RegistrationColumns.Services],
        roles: {
          CR: elem[Roles.CR] === Decision.Yes,
          FC: elem[Roles.FC] === Decision.Yes,
          QC: elem[Roles.QC] === Decision.Yes,
          TE: elem[Roles.TE] === Decision.Yes,
          SE: elem[Roles.SE] === Decision.Yes,
          SQR: elem[Roles.SQR] === Decision.Yes,
        },
        experience: elem[RegistrationColumns.Experience],
        influencer: elem[RegistrationColumns.Influencer],
        recommendedBy: elem[RegistrationColumns.RecommendedBy],
      };
    });

    await readyForDatabaseUpdate.forEach(async (spreadsheetRecord: any) => {
      const Users = db.ref('/users');
      await Users.orderByChild('emailAddress')
        .equalTo(spreadsheetRecord['emailAddress'])
        .once('value', async (snapshot: functions.database.DataSnapshot) => {
          if (snapshot.exists() === false) {
            // No such email exist, create new record
            await Users.push(spreadsheetRecord);
          }
        });
    });

    res.status(200).send('Ok');
  }
);
