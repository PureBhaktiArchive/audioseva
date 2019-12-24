/*!
 * sri sri guru gauranga jayatah
 */

import { Person } from './Person';

export interface Submission {
  author?: Person;
  created: number;
  changed: number;
  completed?: number;
  comments?: String;
}
