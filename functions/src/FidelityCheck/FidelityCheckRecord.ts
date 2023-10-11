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

export interface FidelityCheckRecord {
  file: StorageFileReference;
  contentDetails: ContentDetails;
  fidelityCheck: FidelityCheck;
  approval: Approval;
}
