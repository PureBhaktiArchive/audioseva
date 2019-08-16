/*!
 * sri sri guru gauranga jayatah
 */

import { AudioFileAnnotation } from '../AudioFileAnnotation';
import { Submission } from '../Submission';
import { TimingInterval } from '../TimingInterval';

export class SQRSubmission extends Submission {
  duration: TimingInterval;
  soundQualityRating: string;
  soundIssues: AudioFileAnnotation;
  unwantedParts: AudioFileAnnotation;

  constructor(source: Partial<SQRSubmission>) {
    super(source);
  }
}
