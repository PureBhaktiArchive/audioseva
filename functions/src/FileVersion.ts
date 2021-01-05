/*!
 * sri sri guru gauranga jayatah
 */

import { FileResolution } from './FileResolution';
import { StorageFileReference } from './StorageFileReference';

export interface FileVersion {
  timestamp?: number; // Can be null for a fake version
  uploadPath?: string; // Can be null for a fake version
  file?: StorageFileReference; // Explicit file reference for download
  resolution?: FileResolution;
}
