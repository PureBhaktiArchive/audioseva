/*!
 * sri sri guru gauranga jayatah
 */

import { DateTime } from 'luxon';
import { FileResolution } from './FileResolution';

export class FileVersion {
  timestamp: DateTime;
  uploadPath: string;
  resolution: FileResolution;

  constructor(source: Partial<FileVersion>) {
    Object.assign(this, source);
  }
}
