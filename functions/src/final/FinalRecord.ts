/*!
 * sri sri guru gauranga jayatah
 */

import { FinalContentDetails } from './ContentDetails';

export type FinalRecord = AssignmentRecord | NormalRecord | RedirectRecord;

/**
 * Only task ID is preserved when a source record is missing or unpublished.
 */
export interface AssignmentRecord {
  /** The File ID in the Archive */
  id: number;
  metadata?: {
    taskId?: string;
  };
}

export type NormalRecord = AssignmentRecord & FinalContentDetails;

/**
 * When a previously published record is considered a duplicate of another one.
 * The assignment to a task ID is preserved.
 */
export interface RedirectRecord extends AssignmentRecord {
  redirectTo: number;
}
