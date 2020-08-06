/*!
 * sri sri guru gauranga jayatah
 */

import { FileResolution } from './FileResolution';

export interface FileVersion {
  timestamp?: number; // Can be null for a fake version
  uploadPath?: string; // Can be null for a fake version
  isFake?: boolean; // Fake versions are added for the tasks that were finalized before the system came in place
  resolution?: FileResolution;
}
