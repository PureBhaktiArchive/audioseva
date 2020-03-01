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
        (row, index) =>
          index > 0 || /^\w+-\d+-\d{1,2}$/.test(row['Output File Name']),
        `Task ID is incorrect.`
      ),
      new ValidationRuleForEach(
        row => !row['Output File Name'] || /^(non-)?SEd$/i.test(row['SEd?']),
        `SEd is incorrect.`
      ),
      new ValidationRuleForEach(
        ({ 'Beginning Time': beginningTime, 'End Time': endingTime }) =>
          !Number.isNaN(DateTimeConverter.humanToSeconds(beginningTime)) &&
          !Number.isNaN(DateTimeConverter.humanToSeconds(endingTime)),
        'Timing is incorrect.'
      ),
      new ValidationRuleForEach(
        row => !row['Output File Name'] || !row['Continuation'],
        `Continuation From is not empty for the first chunk.`
      ),
      new ValidationRuleForEach(
        (row, index, source) =>
          index === 0 || row['Continuation'] === source[index - 1]['File Name'],
        'Continuation is not matching the file name.'
      ),
    ]);
  }
}
