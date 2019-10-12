/*!
 * sri sri guru gauranga jayatah
 */

import { TimingInterval } from './TimingInterval';

export interface AudioChunk extends TimingInterval {
  fileName: string;
  unwantedParts?: string;
}
