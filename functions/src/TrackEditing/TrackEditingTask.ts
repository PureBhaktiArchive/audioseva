/*!
 * sri sri guru gauranga jayatah
 */

import { Allotment } from '../Allotment';
import { AudioChunk } from '../AudioChunk';
import { FileVersion } from '../FileVersion';

interface FileVersionMap {
  [versionKey: string]: FileVersion;
}

export interface TrackEditingTask extends Allotment {
  id: string;
  isRestored: boolean;
  chunks: AudioChunk[];
  timestampImported?: number;
  versions?: FileVersionMap;
}
