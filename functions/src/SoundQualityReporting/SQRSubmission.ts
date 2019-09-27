/*!
 * sri sri guru gauranga jayatah
 */

import { AudioAnnotationArray } from '../AudioAnnotation';
import { Submission } from '../Submission';
import { TimingInterval } from '../TimingInterval';

export class SQRSubmission extends Submission {
  duration: TimingInterval;
  soundQualityRating: string;
  soundIssues: AudioAnnotationArray;
  unwantedParts: AudioAnnotationArray;

  constructor(source: Partial<SQRSubmission>) {
    super(source);
  }
}
