/*!
 * sri sri guru gauranga jayatah
 */

import { StorageFileReference } from '../StorageFileReference';
import { ContentDetails } from './ContentDetails';

export type FinalRecord = AssignmentRecord | NormalRecord | RedirectRecord;

/**
 * Only task ID is preserved when a source record is missing or unpublished
 */
export interface AssignmentRecord {
  taskId: string;
}

export interface NormalRecord extends AssignmentRecord {
  file: StorageFileReference;
  contentDetails: ContentDetails;
}

/**
 * When a previously published record is considered a duplicate of another one.
 * The assignment to a task ID is preserved.
 */
export interface RedirectRecord extends AssignmentRecord {
  redirectTo: number;
}
