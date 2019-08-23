/*!
 * sri sri guru gauranga jayatah
 */

import { Allotment } from '../Allotment';
import { AudioChunk } from '../AudioChunk';
import { FileVersion } from '../FileVersion';

export class TrackEditingTask extends Allotment {
  chunks: AudioChunk[];
  versions: FileVersion[];

  constructor(source: Partial<TrackEditingTask>) {
    super(source);
    Object.assign(this, source);
  }
}
