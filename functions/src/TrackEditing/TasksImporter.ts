/*!
 * sri sri guru gauranga jayatah
 */

import { AllotmentStatus } from '../Allotment';
import { ValidationRuleForEach } from '../validation/ValidationRule';
import { Validator } from '../validation/Validator';
import { AllotmentRow } from './AllotmentRow';
import { ChunkRow } from './ChunkRow';
import { TrackEditingTask } from './TrackEditingTask';
import _ = require('lodash');
import admin = require('firebase-admin');

export class TasksImporter {
  public import(chunkRows: ChunkRow[], allotmentRows: AllotmentRow[]) {
    const allotmentsMap = _.chain(allotmentRows)
      .keyBy(({ taskId }) => taskId)
      .mapValues(({ status, assignee, timestampGiven }) => ({
        assignee,
        status,
        timestampGiven,
      }))
      .value();

    return (
      _.chain(chunkRows)
        // Skip empty rows
        .filter(row => !!row.fileName)
        // Skip first rows without Task ID
        .dropWhile(row => !row.taskId)
        // Group chunks of one task together
        .reduce((accumulator, row) => {
          if (row.taskId) accumulator.push([]);
          accumulator[accumulator.length - 1].push(row);
          return accumulator;
        }, new Array<Array<ChunkRow>>())
        // Validate rows
        .filter(taskRows => {
          const validationResult = new TaskValidator().validate(taskRows);
          if (!validationResult.isValid)
            console.warn(`${taskRows[0].taskId}:`, validationResult.messages);
          return validationResult.isValid;
        })
        // Convert the rows into the tasks
        .map(
          taskRows =>
            new TrackEditingTask(taskRows[0].taskId, {
              status: AllotmentStatus.Spare,
              isRestored: taskRows[0].isRestored,
              chunks: taskRows.map(row =>
                _.pick(row, [
                  'fileName',
                  'beginning',
                  'ending',
                  'unwantedParts',
                ])
              ),
              timestampImported: admin.database.ServerValue.TIMESTAMP,
            })
        )
        // Mix allotments into the tasks
        .forEach(task => _.assign(task, allotmentsMap[task.id]))
        .value()
    );
  }
}

class TaskValidator extends Validator<ChunkRow[]> {
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
