/*!
 * sri sri guru gauranga jayatah
 */

import { AudioAnnotation } from '../AudioAnnotation';
import { Submission } from '../Submission';
import { TimingInterval } from '../TimingInterval';

export interface SQRSubmission extends Submission {
  duration: TimingInterval<string>;
  soundQualityRating: string;
  soundIssues: AudioAnnotation[];
  unwantedParts: AudioAnnotation[];
}
