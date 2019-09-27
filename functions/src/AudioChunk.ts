/*!
 * sri sri guru gauranga jayatah
 */

import { TimingInterval } from './TimingInterval';

export class AudioChunk extends TimingInterval {
  fileName: string;
  unwantedParts?: string;

  constructor(source: Partial<AudioChunk>) {
    super();
    Object.assign(this, source);
  }
}
