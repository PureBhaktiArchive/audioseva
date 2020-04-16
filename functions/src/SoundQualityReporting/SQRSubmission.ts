/*!
 * sri sri guru gauranga jayatah
 */

import { AudioAnnotation } from '../AudioAnnotation';
import { Submission } from '../Submission';

export interface SQRSubmission extends Submission {
  soundQualityRating: string;
  soundIssues: AudioAnnotation[];
  unwantedParts: AudioAnnotation[];
}
