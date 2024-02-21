/*!
 * sri sri guru gauranga jayatah
 */

import { ContentDetails } from '../ContentDetails';
import { StorageFileReference } from '../StorageFileReference';

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
  duration: number;
}

export interface ApprovedRecord extends CheckedRecord {
  contentDetails: ContentDetails;
  approval: Approval;
}
