/*!
 * sri sri guru gauranga jayatah
 */

import { FileResolution } from './FileResolution';

export interface FileVersion {
  timestamp?: number; // Can be null for a fake version
  uploadPath?: string; // Can be null for a fake version
  file?: // Explicit file specification for download
  {
    bucket: string;
    name: string;
    generation?: number; // Used to refer to the fixed version of the edited file in the cloud bucket
  };
  resolution?: FileResolution;
}
