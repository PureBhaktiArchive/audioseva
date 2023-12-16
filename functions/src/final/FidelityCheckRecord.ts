/*!
 * sri sri guru gauranga jayatah
 */

import { StorageFileReference } from '../StorageFileReference';
import { ContentDetails } from './ContentDetails';

export interface Approval {
  timestamp: number;
}

export interface FidelityCheck {
  timestamp: number;
  author: string;
}

export interface Replacement {
  timestamp: number;
  taskId: string;
}

export type FidelityCheckRecord = (CheckedRecord | ApprovedRecord) & {
  replacement?: Replacement;
};

export interface CheckedRecord {
  file: StorageFileReference;
  fidelityCheck: FidelityCheck;
}

export interface ApprovedRecord extends CheckedRecord {
  contentDetails: ContentDetails;
  approval: Approval;
}
