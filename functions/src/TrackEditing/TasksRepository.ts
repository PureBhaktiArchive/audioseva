/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { createSchema, morphism } from 'morphism';
import { AllotmentStatus } from '../Allotment';
import { DateTimeConverter } from '../DateTimeConverter';
import { FileVersion } from '../FileVersion';
import { trackEditingVersionOutputLink } from '../Frontend';
import { RequireOnly } from '../RequireOnly';
import { Spreadsheet } from '../Spreadsheet';
import { ChunkRow, schema as chunkRowSchema } from './ChunkRow';
import { TaskValidator } from './TaskValidator';
import { TrackEditingTask } from './TrackEditingTask';
import admin = require('firebase-admin');
import _ = require('lodash');

export type IdentifyableTask = RequireOnly<TrackEditingTask, 'id'>;

const baseRef = admin.database().ref(`/TE`);
const tasksRef = baseRef.child(`tasks`);

export class TasksRepository {
  static async open() {
    const repository = new TasksRepository();
    await repository.open();
    return repository;
  }

  private allotmentsSheet: Spreadsheet;

  public async open() {
    this.allotmentsSheet = await Spreadsheet.open(
      functions.config().te.spreadsheet.id,
      'Allotments'
    );
  }

  private rowToObjectSchema = createSchema<IdentifyableTask>({
    id: 'Task ID',
    isRestored: ({ 'SEd?': text }) => (text ? !/^non/i.test(text) : undefined),
    status: ({ Status: status }) => status?.trim() || AllotmentStatus.Spare,
    timestampGiven: ({ 'Date Given': date }) =>
      date ? DateTimeConverter.fromSerialDate(date).toMillis() : null,
    timestampDone: ({ 'Date Done': date }) =>
      date ? DateTimeConverter.fromSerialDate(date).toMillis() : null,
    assignee: ({ Devotee: name, Email: emailAddress }) => ({
      name: name?.trim() || null,
      emailAddress: emailAddress?.trim() || null,
    }),
  });

  private objectToRowSchema = createSchema<any, IdentifyableTask>({
    'Task ID': 'id',
    'SEd?': ({ isRestored }) => (isRestored ? 'SE' : 'non-SE'),
    Status: ({ status }) => (status === AllotmentStatus.Spare ? null : status),
    'Date Given': ({ timestampGiven }) =>
      timestampGiven
        ? DateTimeConverter.toSerialDate(DateTime.fromMillis(timestampGiven))
        : null,
    'Date Done': ({ timestampDone }) =>
      timestampDone
        ? DateTimeConverter.toSerialDate(DateTime.fromMillis(timestampDone))
        : null,
    Devotee: 'assignee.name',
    Email: 'assignee.emailAddress',
    'Upload Link': ({ id, lastVersion }) =>
      lastVersion ? trackEditingVersionOutputLink(id, lastVersion.id) : null,
    'Upload Date': ({ lastVersion }) =>
      lastVersion
        ? DateTimeConverter.toSerialDate(
            DateTime.fromMillis(lastVersion.timestamp)
          )
        : null,
    'Latest Resolution': ({ lastVersion }) =>
      lastVersion && lastVersion.resolution
        ? lastVersion.resolution.isApproved
          ? 'Approved'
          : `Disapproved: ${lastVersion.resolution.feedback}`
        : null,
    'Resolution Date': ({ lastVersion }) =>
      lastVersion && lastVersion.resolution
        ? DateTimeConverter.toSerialDate(
            DateTime.fromMillis(lastVersion.resolution.timestamp)
          )
        : null,
    'Checked By': ({ lastVersion }) => lastVersion?.resolution?.author?.name,
  });

  private getTaskRef(taskId: string) {
    return tasksRef.child(taskId);
  }

  public async getTask(taskId: string) {
    const snapshot = await this.getTaskRef(taskId).once('value');
    return snapshot.exists()
      ? new TrackEditingTask(taskId, snapshot.val())
      : null;
  }

  public async getTasks(taskIds: string[]) {
    return await Promise.all(taskIds.map(async taskId => this.getTask(taskId)));
  }

  public async save(...tasks: IdentifyableTask[]) {
    await this.saveToDatabase(tasks);

    const updatedTasks = await this.getTasks(tasks.map(({ id }) => id));

    await this.saveToSpreadsheet(updatedTasks);
    return updatedTasks;
  }

  public async saveNewVersion(taskId: string, version: FileVersion) {
    await this.getTaskRef(taskId)
      .child('versions')
      .push(version);

    const updatedTask = await this.getTask(taskId);

    await this.saveToSpreadsheet([updatedTask]);
    return updatedTask;
  }

  private async saveToDatabase(tasks: IdentifyableTask[]) {
    await tasksRef.update(
      _.chain(tasks)
        .flatMap(task =>
          _(task)
            .omit(task, 'id')
            .map((value, key) => [`${task.id}/${key}`, value])
            .value()
        )
        .fromPairs()
        .value()
    );
  }

  public async saveToSpreadsheet(tasks: TrackEditingTask[]) {
    const rows = morphism(this.objectToRowSchema, tasks);
    await this.allotmentsSheet.updateOrAppendRows(
      <string>this.rowToObjectSchema.id,
      rows
    );
  }

  public async importTasks() {
    const tasksSheet = await Spreadsheet.open(
      functions.config().te.spreadsheet.id,
      'Tasks'
    );

    const tasks = _.chain(await tasksSheet.getRows(chunkRowSchema))
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
          console.info(`${taskRows[0].taskId}:`, validationResult.messages);
        return validationResult.isValid;
      })
      // Convert the rows into the tasks
      .map(
        taskRows =>
          new TrackEditingTask(taskRows[0].taskId, {
            status: AllotmentStatus.Spare,
            isRestored: taskRows[0].isRestored,
            chunks: taskRows.map(row =>
              _.pick(row, ['fileName', 'beginning', 'ending', 'unwantedParts'])
            ),
          })
      )
      .value();

    await this.saveToDatabase(tasks);
    return tasks.length;
  }

  public async syncAllotments() {
    /// Getting rows and snapshot in parallel
    const [rows, snapshot] = await Promise.all([
      this.allotmentsSheet.getRows(this.rowToObjectSchema),
      tasksRef.once('value'),
    ]);

    const fromSpreadsheet = _.chain(rows)
      .keyBy(({ id }) => id)
      .mapValues(
        ({ status, assignee, timestampGiven }, id) =>
          new TrackEditingTask(id, {
            assignee,
            status,
            timestampGiven,
          })
      )
      .value();

    // Finding tasks in the database that do not exist in the Allotments sheet
    const [tasksForDatabase, tasksForSpreadsheet] = _.chain(snapshot.val())
      .toPairs()
      .map(
        ([taskId, task]) =>
          fromSpreadsheet[taskId] || new TrackEditingTask(taskId, task)
      )
      /**
       * Partition by `isRestored`
       * because it is not filled from the spreadsheet in this case
       * so the first outcome will be tasks from spreadsheet to database
       */
      .partition(task => task.isRestored === undefined)
      .value();

    await Promise.all([
      this.saveToDatabase(tasksForDatabase),
      this.saveToSpreadsheet(tasksForSpreadsheet),
    ]);
  }
}
