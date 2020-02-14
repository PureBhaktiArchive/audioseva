/*!
 * sri sri guru gauranga jayatah
 */

import { DateTimeConverter } from '../DateTimeConverter';
import { ValidationRuleForEach } from '../validation/ValidationRule';
import { Validator } from '../validation/Validator';
import { ChunkRow } from './ChunkRow';

export class TaskValidator extends Validator<ChunkRow[]> {
  constructor() {
    super([
      new ValidationRuleForEach(
        row => !row.outputFileName || /^(non-)?SEd$/i.test(row.sed),
        `SEd is incorrect.`
      ),
      new ValidationRuleForEach(
        ({ beginningTime, endingTime }) =>
          !Number.isNaN(DateTimeConverter.humanToSeconds(beginningTime)) &&
          !Number.isNaN(DateTimeConverter.humanToSeconds(endingTime)),
        'Timing is incorrect.'
      ),
      new ValidationRuleForEach(
        row => !row.outputFileName || !row.continuationFrom,
        `Continuation From is not empty for the first chunk.`
      ),
      new ValidationRuleForEach(
        (row, index, source) =>
          !index || row.continuationFrom === source[index - 1].fileName,
        'Continuation is not matching the file name.'
      ),
    ]);
  }
}
