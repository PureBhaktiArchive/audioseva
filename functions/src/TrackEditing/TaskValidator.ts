/*!
 * sri sri guru gauranga jayatah
 */

import { ValidationRuleForEach } from '../validation/ValidationRule';
import { Validator } from '../validation/Validator';
import { ChunkRow } from './ChunkRow';

export class TaskValidator extends Validator<ChunkRow[]> {
  constructor() {
    super([
      new ValidationRuleForEach(
        row => !row.taskId || row.isRestored !== undefined,
        `SEd is not defined.`
      ),
      new ValidationRuleForEach(
        ({ beginning, ending }) =>
          !Number.isNaN(beginning) && !Number.isNaN(ending),
        'Timing is incorrect.'
      ),
      new ValidationRuleForEach(
        row => !row.taskId || !row.continuationFrom,
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
