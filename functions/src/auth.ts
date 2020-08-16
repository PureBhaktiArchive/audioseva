/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import _ = require('lodash');

export function abortCall(
  code: functions.https.FunctionsErrorCode,
  message: string
) {
  console.error(message);
  throw new functions.https.HttpsError(code, message);
}

/*
 * Checks that the callable function is called by an authorized user
 * @param context Callable function context
 * @param roles Required roles (any of them)
 */
export function authorize(
  context: functions.https.CallableContext,
  roles: string[]
) {
  if (
    !process.env.FUNCTIONS_EMULATOR &&
    !_.some(roles, (role) => _.get(context.auth?.token?.roles, role))
  )
    abortCall(
      'permission-denied',
      'The user is not authorized to call this function.'
    );
}
