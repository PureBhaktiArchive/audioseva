/*!
 * sri sri guru gauranga jayatah
 */

import { Assignee } from './Assignee';

export interface Submission {
  author?: Assignee;
  created: number;
  changed: number;
  completed?: number;
  comments?: String;
}
