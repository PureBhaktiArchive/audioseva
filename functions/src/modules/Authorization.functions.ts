import { database, auth } from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.database();

const userRoles = database.ref('/users/{userId}/roles');

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
    for (let role in snapshot.val()) {
      removedRoles[role] = false;
    }
    const email = await snapshot.ref.parent.child('emailAddress').once('value');
    return setClaims(removedRoles, context, email.val());
  }
);

export const onCreateUserCustomClaimRoles = auth
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
