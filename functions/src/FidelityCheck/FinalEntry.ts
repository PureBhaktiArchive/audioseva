/*!
 * sri sri guru gauranga jayatah
 */

import { StorageFileReference } from '../StorageFileReference';
import { ContentDetails } from './ContentDetails';

export interface FinalEntry {
  file: StorageFileReference;
  contentDetails: ContentDetails & { topicsReady: boolean };
}
