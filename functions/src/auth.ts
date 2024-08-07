/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import _ = require('lodash');

/**
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
    throw new functions.https.HttpsError(
      'permission-denied',
      'The user is not authorized to call this function.'
    );
}
