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
    const mode = (await baseRef.child('sync/mode').once('value')).val();
    if ((mode || 'off') === 'off') {
      console.info('Sync is off, see /TE/sync/mode.');
      return;
    }

    const shouldWrite = mode === 'on';

    /// Getting spreadsheet rows and database snapshot in parallel
    const [allotmentsFromSpreadsheet, snapshot] = await Promise.all([
      this.allotmentsSheet.getRows(this.rowToObjectSchema),
      tasksRef.once('value'),
    ]);

    const idsInSpreadsheet = new Set(
      _.map(allotmentsFromSpreadsheet, ({ id }) => id)
    );

    const tasksFromDatabase = _.chain(snapshot.val())
      .mapValues((source, id) => new TrackEditingTask(id, source))
      .value();

    /// Adding missing tasks from the database to the spreadsheet
    const tasksForSpreadsheet = _.chain(tasksFromDatabase)
      .filter(task => !idsInSpreadsheet.has(task.id))
      .forEach(task => {
        console.info(
          `${shouldWrite ? 'Adding' : 'Would add'} missing task ${task.id}`,
          'into the spreadsheet.'
        );
      })
      .value();

    /// Updating allotment info from the spreadsheet to the database
    const tasksForDatabase = _.chain(allotmentsFromSpreadsheet)
      .filter(allotment => {
        const task = tasksFromDatabase[allotment.id];

        if (!task) {
          console.info(`Task ${allotment.id} is not found in the database.`);
          return false;
        }

        /// Updating only if any of these fields have changed
        if (
          allotment.status === task.status &&
          (allotment.assignee?.emailAddress || null) ===
            (task.assignee?.emailAddress || null)
        )
          return false;

        /// Checking the sanity of the spreadsheet data
        const mustBeAssigned = [
          AllotmentStatus.Given,
          AllotmentStatus.WIP,
          AllotmentStatus.Done,
        ].includes(allotment.status);
        const mustNotBeAssigned = [AllotmentStatus.Spare].includes(
          allotment.status
        );
        const isAssigned = !!allotment.assignee?.emailAddress;
        if (
          (mustBeAssigned && !isAssigned) ||
          (mustNotBeAssigned && isAssigned)
        ) {
          console.info(
            `Task ${allotment.id} has invalid data in the spreadsheet:`,
            `“${allotment.status} ${allotment.assignee?.emailAddress} ”.`,
            'Skipping.'
          );
          return false;
        }

        console.info(
          `${shouldWrite ? 'Updating' : 'Would update'} task ${task.id}`,
          'in the database',
          `from “${task.status} ${task.assignee?.emailAddress}”`,
          `to “${allotment.status} ${allotment.assignee?.emailAddress}”.`
        );

        return true;
      })
      /// Updating only these fields
      .map(({ id, status, assignee, timestampGiven }) => ({
        id,
        assignee,
        status,
        timestampGiven,
      }))
      .value();

    if (shouldWrite) {
      console.log(`Updating spreadsheet and database.`);
      await Promise.all([
        this.saveToSpreadsheet(tasksForSpreadsheet),
        this.saveToDatabase(tasksForDatabase),
      ]);
    } else console.log(`Doing nothing.`);
  }
}
