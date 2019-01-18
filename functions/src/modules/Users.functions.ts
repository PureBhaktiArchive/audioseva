import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { IUser } from "../../../types/Users";

const db = admin.database();

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

  const oldUser = await db.ref("/users/").orderByChild("/emailAddress")
                  .equalTo(webform.email_address).once("value");

  // If the user already exists stop the execution and log the error
  if (oldUser.val() !== undefined) {
    console.warn(`Warning! User already exist with email: ${webform.email_address}`)
    return false;
  }

  const serviceRoles = {
    "Content Reporting": "CR",
    "Track Editing":     "TE",
    "Sound Engineering": "SE",
    "Quality Checking":  "QE",
    "Fidelity Checking": "FC",
  };

  // if user email doesn't exists prepare the newUser Object
  const newUser: IUser = {
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
    services: (<any>Object).values(webform.seva).join(", "),
    experience: webform.experience,
    influencer: webform.where_did_u_hear_about_this_seva,
    recommendedBy: webform.recommended_by,
    roles: webform.seva.reduce((result, service) => {
      const code = serviceRoles[service];
      result[code] = true;

      return result;
    }, {})
  }

  db.ref(`/users/`).push(newUser);

  return true;
});
