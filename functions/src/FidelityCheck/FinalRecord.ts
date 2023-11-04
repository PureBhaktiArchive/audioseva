/*!
 * sri sri guru gauranga jayatah
 */

import { StorageFileReference } from '../StorageFileReference';
import { ContentDetails } from './ContentDetails';

export type FinalRecord = NormalRecord | RedirectRecord;

export interface NormalRecord {
  taskId: string;
  file: StorageFileReference;
  contentDetails: ContentDetails;
}

export interface RedirectRecord {
  redirectTo: number;
}
