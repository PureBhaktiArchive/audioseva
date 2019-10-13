/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';

/*
 * Checks that the callable function is called by a coordinator
 * @param context Callable function context
 */
export function authorizeCoordinator(context: functions.https.CallableContext) {
  if (
    !functions.config().emulator &&
    (!context.auth || !context.auth.token || !context.auth.token.coordinator)
  ) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'The function must be called by an authenticated coordinator.'
    );
  }
}
