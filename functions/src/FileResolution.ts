/*!
 * sri sri guru gauranga jayatah
 */

import { Person } from './Person';

export interface FileResolution {
  author: Person;
  timestamp: number;
  isApproved: boolean;
  isRechecked?: boolean;
  feedback: string;
}
