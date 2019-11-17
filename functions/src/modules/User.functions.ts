/*
 * sri sri guru gauranga jayatah
 */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { authorizeCoordinator } from '../auth';
import { DateTimeConverter } from '../DateTimeConverter';
import { Spreadsheet } from '../Spreadsheet';

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
export const importUserRegistrationData = functions.https.onCall(
  async (data, context) => {
    authorizeCoordinator(context);

    const sheet = await Spreadsheet.open(
      functions.config().registrations.spreadsheet_id,
      'Registrations'
    );

    const registrationRows = await sheet.getRows();

    const readyForDatabaseUpdate = registrationRows.map((row: any) => {
      return {
        notes: row[RegistrationColumns.Details],
        status: row[RegistrationColumns.Status],
        timestamp: DateTimeConverter.fromSerialDate(
          row[RegistrationColumns.Timestamp],
          sheet.timeZone
        ).toMillis(),
        name: row[RegistrationColumns.Name],
        location: row[RegistrationColumns.Country],
        emailAddress: row[RegistrationColumns.EmailAddress],
        phoneNumber: row[RegistrationColumns.PhoneNumber],
        isAvailableOnWhatsApp: row[RegistrationColumns.WhatsApp],
        languages: row[RegistrationColumns.Languages]
          .split(',')
          .reduce((result: any, language: string) => {
            result[language.trim()] = true;
            return result;
          }, {}),
        services: row[RegistrationColumns.Services],
        roles: {
          CR: row[Roles.CR] === Decision.Yes,
          FC: row[Roles.FC] === Decision.Yes,
          TE: row[Roles.TE] === Decision.Yes,
          SE: row[Roles.SE] === Decision.Yes,
          SQR: row[Roles.SQR] === Decision.Yes,
        },
        experience: row[RegistrationColumns.Experience],
        influencer: row[RegistrationColumns.Influencer],
        recommendedBy: row[RegistrationColumns.RecommendedBy],
      };
    });

    await Promise.all(
      readyForDatabaseUpdate.map(async (spreadsheetRecord: any) => {
        const usersRef = db.ref('/users');
        const snapshot = await usersRef
          .orderByChild('emailAddress')
          .equalTo(spreadsheetRecord['emailAddress'])
          .once('value');
        if (snapshot.exists() === false) {
          // No such email exist, create new record
          await usersRef.push(spreadsheetRecord);
        }
      })
    );
  }
);

/**
 * Process registration of webform data
 * 1. Registers user by transferring data into /users/ path
 * 2. Check if users already exists
 *
 * @function restructureRegistrationData()
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

export const updateUserClaims = functions.database
  .ref('/users/{userId}/roles')
  .onWrite(async (change, context) => {
    const emailAddress = await change.after.ref.parent
      .child('emailAddress')
      .once('value');
    if (!emailAddress.exists()) return;

    const user = await admin.auth().getUserByEmail(emailAddress.val());
    if (!user) return;

    console.info(`Setting claims for ${user.email}:`, change.after.val());
    await admin.auth().setCustomUserClaims(user.uid, change.after.val());
  });

export const setClaimsForNewUser = functions.auth
  .user()
  .onCreate(async event => {
    console.info(`User ${event.displayName} (${event.email}) is created.`);
    const metadataSnapshot = await db
      .ref(`/users`)
      .orderByChild('emailAddress')
      .equalTo(event.email)
      .once('value');
    if (!metadataSnapshot.exists()) return;

    const roles = metadataSnapshot.val().roles;
    console.info(`Setting claims for ${event.email}:`, roles);
    await admin.auth().setCustomUserClaims(event.uid, roles);
    await metadataSnapshot.ref.update({ uid: event.uid });
  });

export const getAssignees = functions.https.onCall(
  async ({ phase }, context) => {
    authorizeCoordinator(context);

    const registrationsSheet = await Spreadsheet.open(
      functions.config().registrations.spreadsheet_id,
      'Registrations'
    );

    const rows = await registrationsSheet.getRows();

    return rows
      .filter(item => item[phase || Roles.CR] === Decision.Yes)
      .map(item => ({
        emailAddress: item['Email Address'],
        name: item['Name'],
        location: item['Country'],
        languages: item['Languages'] ? item['Languages'].split(/,\s?/) : [],
        phone: item['Phone Number'],
        id: item['Email Address'],
      }));
  }
);
