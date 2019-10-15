/*!
 * sri sri guru gauranga jayatah
 */

import { TimingInterval } from './TimingInterval';

export interface AudioAnnotation extends TimingInterval<string> {
  entireFile: boolean;
  type: string;
  description: string;
}

export const formatAudioAnnotations = (
  ...annotations: AudioAnnotation[]
): string => {
  return annotations
    .map(
      ({ entireFile, beginning, ending, type, description }) =>
        `${
          entireFile ? 'Entire file' : `${beginning}–${ending}`
        }: ${type} — ${description}`
    )
    .join('\n');
};
