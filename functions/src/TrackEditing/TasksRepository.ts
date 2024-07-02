/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { AbstractRepository } from '../AbstractRepository';
import { AudioChunk } from '../AudioChunk';
import { DateTimeConverter } from '../DateTimeConverter';
import { FileVersion } from '../FileVersion';
import { trackEditingVersionOutputLink } from '../Frontend';
import { Spreadsheet } from '../Spreadsheet';
import { ChunkRow } from './ChunkRow';
import { TaskValidator } from './TaskValidator';
import { TrackEditingAllotmentRow } from './TrackEditingAllotmentRow';
import { TrackEditingTask } from './TrackEditingTask';
import admin = require('firebase-admin');
import _ = require('lodash');

export class TasksRepository extends AbstractRepository<
  TrackEditingAllotmentRow,
  TrackEditingTask,
  'id',
  'Task ID'
> {
  constructor() {
    super(
      functions.config().te.spreadsheet.id as string,
      'id',
      'Task ID',
      admin.database().ref(`/TE`).child(`tasks`)
    );
  }

  protected mapTask = (task: TrackEditingTask): TrackEditingAllotmentRow => {
    const lastVersionKey = _.findLastKey(task.versions);
    const lastResolvedVersion = _.findLast(
      task.versions,
      (version) => !!version.resolution
    );

    return {
      'Task ID': task.id,
      'SEd?': task.isRestored ? 'SEd' : 'non-SEd',
      'Upload Link': lastVersionKey
        ? trackEditingVersionOutputLink(task.id, lastVersionKey)
        : null,
      'Upload Date':
        lastVersionKey && task.versions[lastVersionKey]?.timestamp
          ? DateTimeConverter.toSerialDate(
              DateTime.fromMillis(task.versions[lastVersionKey].timestamp)
            )
          : null,
      'Uploaded By': lastVersionKey
        ? task.versions[lastVersionKey]?.author?.name
        : null,
      'Latest Resolution': lastResolvedVersion
        ? lastResolvedVersion.resolution.isApproved
          ? 'Approved'
          : `Disapproved: ${lastResolvedVersion.resolution.feedback}`
        : null,
      'Resolution Date': lastResolvedVersion
        ? DateTimeConverter.toSerialDate(
            DateTime.fromMillis(lastResolvedVersion.resolution.timestamp)
          )
        : null,
      'Checked By': lastResolvedVersion
        ? lastResolvedVersion.resolution.author?.name || null
        : null,
    };
  };

  public getNewVersionRef(taskId: string) {
    return this.getTaskRef(taskId).child('versions').push();
  }

  public async saveNewVersion(taskId: string, version: FileVersion) {
    const versionRef = this.getNewVersionRef(taskId);
    await versionRef.set(version);

    const updatedTask = await this.getTask(taskId);

    await this.saveToSpreadsheet([updatedTask]);
    return updatedTask;
  }

  public async importTasks() {
    const tasksSheet = await Spreadsheet.open<ChunkRow>(
      functions.config().te.spreadsheet.id as string,
      'Tasks'
    );

    const tasks = _.chain(await tasksSheet.getRows())
      // Skip empty rows
      .filter((row) => !!row['File Name'])
      // Skip first rows without Task ID
      .dropWhile((row) => !row['Output File Name'])
      // Group chunks of one task together
      .reduce((accumulator, row) => {
        if (row['Output File Name']) accumulator.push([]);
        accumulator[accumulator.length - 1].push(row);
        return accumulator;
      }, new Array<Array<ChunkRow>>())
      // Validate rows
      .filter((taskRows) => {
        const validationResult = new TaskValidator().validate(taskRows);
        if (!validationResult.isValid)
          console.info(
            `${taskRows[0]['Output File Name']}:`,
            validationResult.messages
          );
        return validationResult.isValid;
      })
      // Convert the rows into the tasks
      .map((taskRows) => ({
        id: taskRows[0]['Output File Name'].trim().toUpperCase(),
        isRestored: taskRows[0]['SEd?'].toUpperCase() === 'SED',
        chunks: taskRows.map<AudioChunk>(
          ({
            'File Name': fileName,
            'Beginning Time': beginningTime,
            'End Time': endingTime,
            'Unwanted Parts': unwantedParts,
          }) => ({
            fileName,
            beginning: DateTimeConverter.humanToSeconds(beginningTime),
            ending: DateTimeConverter.humanToSeconds(endingTime),
            unwantedParts,
          })
        ),
      }))
      .value();

    await this.saveToDatabase(tasks);
    return tasks.length;
  }
}
