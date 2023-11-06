/*!
 * sri sri guru gauranga jayatah
 */

import { StorageFileReference } from '../StorageFileReference';
import { ContentDetails } from './ContentDetails';

export type FinalRecord = AssignmentRecord | NormalRecord | RedirectRecord;

export interface AssignmentRecord {
  taskId: string;
}

export interface NormalRecord extends AssignmentRecord {
  file: StorageFileReference;
  contentDetails: ContentDetails; // Absent when a record is unpublished
}

export interface RedirectRecord {
  redirectTo: number;
}
