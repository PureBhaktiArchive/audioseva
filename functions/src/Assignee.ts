/*!
 * sri sri guru gauranga jayatah
 */

import * as admin from 'firebase-admin';

export class Assignee {
  name: string;
  emailAddress: string;

  constructor(source: Partial<Assignee>) {
    Object.assign(this, source);
  }

  static async findByEmailAddress(emailAddress: string) {
    const snapshot = await admin
      .database()
      .ref('/users')
      .orderByChild('emailAddress')
      .equalTo(emailAddress)
      .once('value');

    if (!snapshot.exists()) return null;

    return new Assignee(snapshot.val());
  }
}
