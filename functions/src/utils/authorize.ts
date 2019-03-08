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
      console.log('ID Token correctly decoded', decodedIdToken);
      const user = decodedIdToken;
      if (!user) {
        console.error('Error while verifying Firebase ID token. User is null');
        res.status(403).send('Unauthorized');
      }
      return true;
    })
    .catch(error => {
      console.error('Error while verifying Firebase ID token:', error);
      return false
    });
};
