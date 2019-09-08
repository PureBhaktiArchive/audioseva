/*!
 * sri sri guru gauranga jayatah
 */

import { FileResolution } from './FileResolution';

export class FileVersion {
  timestamp: number;
  uploadPath: string;
  resolution: FileResolution;

  constructor(source: Partial<FileVersion>) {
    Object.assign(this, source);
  }
}
