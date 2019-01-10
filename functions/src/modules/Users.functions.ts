import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.database();

/**
 * Sends registration email when a new user is added to /users/ path
 * 
 * @function sendRegistrationEmail()
 */
export const sendRegistrationEmail = functions.database
.ref('/users/{user_id}')
.onCreate(async (snapshot) => {
  const user = snapshot.val();
  const coordinator = functions.config().coordinator;

  db.ref(`/email/notifications`).push({
    template: "registration",
    to: user.emailAddress,
    bcc: coordinator.email_address,
    params: {user},
  });

  return true;
});