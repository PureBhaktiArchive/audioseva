/*!
 * sri sri guru gauranga jayatah
 */

import { createSchema, morphism } from 'morphism';
import { AudioChunk } from '../AudioChunk';
import { DateTimeConverter } from '../DateTimeConverter';
import { TimingInterval } from '../TimingInterval';
import { ValidationRuleForEach } from '../validation/ValidationRule';
import { Validator } from '../validation/Validator';
import { TrackEditingTask } from './TrackEditingTask';
import _ = require('lodash');

interface TasksSheetRow {
  isRestored: boolean;
  taskId: string;
  fileName: string;
  beginning: number;
  ending: number;
  continuationFrom: string;
  unwantedParts: string;
}

export class TasksImporter {
  private schema = createSchema<TasksSheetRow>({
    isRestored: ({ 'SEd?': text }) => (text ? !/^non/i.test(text) : undefined),
    taskId: 'Output File Name',
    fileName: 'File Name',
    beginning: ({ 'Beginning Time': beginning }) =>
      DateTimeConverter.humanToSeconds(beginning),
    ending: ({ 'End Time': ending }) =>
      DateTimeConverter.humanToSeconds(ending),
    continuationFrom: 'Continuation',
    unwantedParts: 'Unwanted Parts',
  });

  public import(rows: object[]) {
    const groupedRows = _(morphism(this.schema, rows))
      .filter(row => !!row.fileName)
      .dropWhile(row => !row.taskId)
      .reduce((accumulator, row) => {
        if (row.taskId) accumulator.push([]);
        accumulator[accumulator.length - 1].push(row);
        return accumulator;
      }, new Array<Array<TasksSheetRow>>());

    return _(groupedRows)
      .filter(taskRows => {
        const validationResult = new TaskValidator().validate(taskRows);
        if (!validationResult.isValid)
          console.warn(`${taskRows[0].taskId}:`, validationResult.messages);
        return validationResult.isValid;
      })
      .map(
        taskRows =>
          new TrackEditingTask(taskRows[0].taskId, {
            isRestored: taskRows[0].isRestored,
            chunks: taskRows.map(
              ({ fileName, beginning, ending, unwantedParts }) =>
                new AudioChunk({ fileName, beginning, ending, unwantedParts })
            ),
          })
      )
      .value();
  }
}

class TaskValidator extends Validator<TasksSheetRow[]> {
  constructor() {
    super([
      new ValidationRuleForEach(
        row => !row.taskId || row.isRestored !== undefined,
        `SEd is not defined.`
      ),
      new ValidationRuleForEach(TimingInterval.IsValid, 'Timing is incorrect.'),
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
