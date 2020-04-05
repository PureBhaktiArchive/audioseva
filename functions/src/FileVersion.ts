/*!
 * sri sri guru gauranga jayatah
 */

import { FileResolution } from './FileResolution';

export interface FileVersion {
  timestamp: number;
  uploadPath: string;
  resolution?: FileResolution;
}
