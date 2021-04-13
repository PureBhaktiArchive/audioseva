/*!
 * sri sri guru gauranga jayatah
 */

import { StorageFileReference } from '../StorageFileReference';
import { ContentDetails } from './ContentDetails';

export interface Approval {
  readyForArchive: boolean;
  timestamp: number;
  topicsReady: boolean;
}

export interface FidelityCheck {
  timestamp: number;
  author: string;
}

export interface FidelityCheckRecord {
  file: StorageFileReference;
  taskId: string;
  contentDetails: ContentDetails;
  fidelityCheck: FidelityCheck;
  approval: Approval;
}
