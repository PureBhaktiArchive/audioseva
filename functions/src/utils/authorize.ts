import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const validateFirebaseIdToken = async (
  req: functions.Request,
  res: functions.Response
): Promise<any> => {
  console.log('Check if request is authorized with Firebase ID token');

  if (
    (!req.headers.authorization ||
      !req.headers.authorization.startsWith('Bearer ')) &&
    !(req.cookies && req.cookies.__session)
  ) {
    console.error(
      'No Firebase ID token was passed as a Bearer token in the Authorization header.',
      'Make sure you authorize your request by providing the following HTTP header:',
      'Authorization: Bearer <Firebase ID Token>',
      'or by passing a "__session" cookie.'
    );
    return false;
  }

  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    console.log('Found "Authorization" header');
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else if (req.cookies) {
    console.log('Found "__session" cookie');
    idToken = req.cookies.__session;
  } else {
    return false;
  }
  admin
    .auth()
    .verifyIdToken(idToken)
    .then(decodedIdToken => {
      const email = decodedIdToken.email;
      if (!email)
        throw new Error('Error while trying to extract the email out of the token.');
      return true;
    })
    .catch(error => {
      console.error(error);
      return false
    });
};
