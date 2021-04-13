/*!
 * sri sri guru gauranga jayatah
 */

import { StorageFileReference } from '../StorageFileReference';
import { ContentDetails } from './ContentDetails';

export interface FinalRecord {
  file: StorageFileReference;
  contentDetails: ContentDetails;
}
