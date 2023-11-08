/*!
 * sri sri guru gauranga jayatah
 */

import { StorageFileReference } from '../StorageFileReference';
import { ContentDetails } from './ContentDetails';

export type FinalRecord = AssignmentRecord | NormalRecord | RedirectRecord;

// Only task ID is preserved when a source record is missing or unpublished
export interface AssignmentRecord {
  taskId: string;
}

export interface NormalRecord extends AssignmentRecord {
  file: StorageFileReference;
  contentDetails: ContentDetails;
}

export interface RedirectRecord {
  redirectTo: number;
}
