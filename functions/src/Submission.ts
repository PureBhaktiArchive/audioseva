/*!
 * sri sri guru gauranga jayatah
 */

import { DateTime } from 'luxon';

export class Submission {
  created: DateTime;
  changed: DateTime;
  completed?: DateTime;
  comments?: String;

  constructor(source: Partial<Submission>) {
    Object.assign(this, source);
  }
}
