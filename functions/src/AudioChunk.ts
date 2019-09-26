/*!
 * sri sri guru gauranga jayatah
 */

import { AudioAnnotationArray } from './AudioAnnotation';
import { TimingInterval } from './TimingInterval';

export class AudioChunk extends TimingInterval {
  fileName: string;
  unwantedParts: AudioAnnotationArray;

  constructor(source: Partial<AudioChunk>) {
    super();
    Object.assign(this, source);
  }
}
