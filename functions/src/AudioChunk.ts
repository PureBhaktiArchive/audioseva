/*!
 * sri sri guru gauranga jayatah
 */

import { AudioAnnotationArray } from './AudioAnnotation';

export class AudioChunk {
  fileName: string;
  unwantedParts: AudioAnnotationArray;

  constructor(source: Partial<AudioChunk>) {
    Object.assign(this, source);
  }
}
