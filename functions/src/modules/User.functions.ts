import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import GoogleSheet from '../services/GoogleSheets';
import { withDefault } from '../utils/parsers';

const db = admin.database();
const userRoles = functions.database.ref('/users/{userId}/roles');

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

/**
 * 1. Scan the Registrations Google Sheet and exports any new users to database
 * 2. Do not import if user email already exists
 *
 */
export const importUserRegistrationData = functions.https.onRequest(
  async (req: functions.Request, res: functions.Response) => {
    const gsheets: GoogleSheet = new GoogleSheet(
      functions.config().registrations.spreadsheet_id,
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
        languages: elem[RegistrationColumns.Languages]
          .split(',')
          .reduce((result: any, language: string) => {
            result[language.trim()] = true;
            return result;
          }, {}),
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
      const usersRef = db.ref('/users');
      await usersRef
        .orderByChild('emailAddress')
        .equalTo(spreadsheetRecord['emailAddress'])
        .once('value', async (snapshot: functions.database.DataSnapshot) => {
          if (snapshot.exists() === false) {
            // No such email exist, create new record
            await usersRef.push(spreadsheetRecord);
          }
        });
    });

    res.status(200).send('Ok');
  }
);

/**
 * Process registration of webform data
 * 1. Registers user by transferring data into /users/ path
 * 2. Check if users already exists
 *
 * @function processRegistration()
 */
export const restructureRegistrationData = functions.database
  .ref('/webforms/registration/{registration_id}')
  .onCreate(async (snapshot, context) => {
    const webform = snapshot.val();

    const oldUser = await db
      .ref('/users/')
      .orderByChild('/emailAddress')
      .equalTo(webform.email_address)
      .once('value');

    // If the user already exists stop the execution and log the error
    if (oldUser.val() !== undefined) {
      console.warn(
        `Warning! User already exist with email: ${webform.email_address}`
      );
      return false;
    }

    const serviceRoles = {
      'Content Reporting': 'CR',
      'Track Editing': 'TE',
      'Sound Engineering': 'SE',
      'Quality Checking': 'QE',
      'Fidelity Checking': 'FC',
    };

    // if user email doesn't exists prepare the newUser Object
    const newUser: any = {
      timestamp: webform.completed,
      emailAddress: webform.email_address,
      phoneNumber: webform.contact_number,
      isAvailableOnWhatsApp: webform.i_am_available_on_whatsapp === 1,
      languages: webform.languages.reduce((result, language) => {
        result[language] = true;
        return result;
      }, {}),
      location: webform.country,
      name: webform.your_name,
      services: (<any>Object).values(webform.seva).join(', '),
      experience: webform.experience,
      influencer: webform.where_did_u_hear_about_this_seva,
      recommendedBy: webform.recommended_by,
      roles: webform.seva.reduce((result, service) => {
        const code = serviceRoles[service];
        result[code] = true;

        return result;
      }, {}),
    };

    db.ref(`/users/`).push(newUser);

    return true;
  });

const setClaims = async (roles, { params: { userId } }: any, email: string) => {
  const user = await admin
    .auth()
    .getUserByEmail(email)
    .catch(() => null);
  if (user) {
    return admin.auth().setCustomUserClaims(user.uid, roles);
  }
  return null;
};

export const onCreateCustomClaimRoles = userRoles.onCreate(
  async (snapshot, context) => {
    const roles = snapshot.val();
    const email = await snapshot.ref.parent.child('emailAddress').once('value');
    return setClaims(roles, context, email.val());
  }
);

export const onDeleteCustomClaimRoles = userRoles.onDelete(
  async (snapshot, context) => {
    const removedRoles = {};
    for (const role in snapshot.val()) {
      removedRoles[role] = false;
    }
    const email = await snapshot.ref.parent.child('emailAddress').once('value');
    return setClaims(removedRoles, context, email.val());
  }
);

export const onCreateUserCustomClaimRoles = functions.auth
  .user()
  .onCreate(async event => {
    const user = await db
      .ref(`/users`)
      .orderByChild('emailAddress')
      .equalTo(event.email)
      .once('value')
      .catch(() => null);
    const userData = user && user.val();
    if (userData && userData.roles) {
      return admin
        .auth()
        .setCustomUserClaims(event.uid, userData.roles)
        .catch(() => null);
    }
    return null;
  });
