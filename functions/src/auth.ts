/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';

export function abortCall(
  code: functions.https.FunctionsErrorCode,
  message: string
) {
  console.error(message);
  throw new functions.https.HttpsError(code, message);
}

/*
 * Checks that the callable function is called by a coordinator
 * @param context Callable function context
 */
export function authorizeCoordinator(context: functions.https.CallableContext) {
  if (
    !functions.config().emulator &&
    (!context.auth || !context.auth.token || !context.auth.token.coordinator)
  )
    abortCall(
      'permission-denied',
      'The function must be called by an authenticated coordinator.'
    );
}
