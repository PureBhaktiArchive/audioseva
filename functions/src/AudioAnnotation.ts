/*!
 * sri sri guru gauranga jayatah
 */

import { TimingInterval } from './TimingInterval';
import _ = require('lodash');

export interface AudioAnnotation extends TimingInterval<string> {
  entireFile: boolean;
  type: string;
  description: string;
}

export const formatAudioAnnotations = (
  ...annotations: AudioAnnotation[]
): string => {
  return _(annotations)
    .filter()
    .map(
      ({ entireFile, beginning, ending, type, description }) =>
        `${
          entireFile ? 'Entire file' : `${beginning}–${ending}`
        }: ${type} — ${description}`
    )
    .join('\n');
};
