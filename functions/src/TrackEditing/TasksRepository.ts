/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { createSchema, morphism } from 'morphism';
import { AllotmentStatus } from '../Allotment';
import { AudioChunk } from '../AudioChunk';
import { DateTimeConverter } from '../DateTimeConverter';
import { FileVersion } from '../FileVersion';
import { trackEditingVersionOutputLink } from '../Frontend';
import { RequireOnly } from '../RequireOnly';
import { Spreadsheet } from '../Spreadsheet';
import { AllotmentRow } from './AllotmentRow';
import { ChunkRow } from './ChunkRow';
import { TaskValidator } from './TaskValidator';
import { TrackEditingTask } from './TrackEditingTask';
import admin = require('firebase-admin');
import _ = require('lodash');

type IdentifiableTask = RequireOnly<TrackEditingTask, 'id'>;

type RestorableTask = Pick<TrackEditingTask, 'id' | 'status' | 'assignee'>;

const baseRef = admin.database().ref(`/TE`);
const tasksRef = baseRef.child(`tasks`);

export class TasksRepository {
  private _allotmentsSheet: Spreadsheet<AllotmentRow>;
  protected async allotmentsSheet() {
    this._allotmentsSheet =
      this._allotmentsSheet ||
      (await Spreadsheet.open<AllotmentRow>(
        functions.config().te.spreadsheet.id,
        'Allotments'
      ));
    return this._allotmentsSheet;
  }

  private mapFromRows = morphism(
    createSchema<RestorableTask, AllotmentRow>({
      id: 'Task ID',
      status: ({ Status: status }) =>
        <AllotmentStatus>status?.trim() || AllotmentStatus.Spare,
      assignee: ({ Devotee: name, Email: emailAddress }) => ({
        name: name?.trim() || null,
        emailAddress: emailAddress?.trim() || null,
      }),
    })
  );

  private mapToRows(tasks: IdentifiableTask[]): AllotmentRow[] {
    return tasks.map<AllotmentRow>(task => {
      const lastVersionKey = _.findLastKey(task.versions);
      const lastResolvedVersion = _.findLast(
        task.versions,
        version => !!version.resolution
      );

      return {
        'Task ID': task.id,
        'SEd?': task.isRestored ? 'SEd' : 'non-SEd',
        Status: task.status === AllotmentStatus.Spare ? null : task.status,
        'Date Given': task.timestampGiven
          ? DateTimeConverter.toSerialDate(
              DateTime.fromMillis(task.timestampGiven)
            )
          : null,
        'Date Done': task.timestampDone
          ? DateTimeConverter.toSerialDate(
              DateTime.fromMillis(task.timestampDone)
            )
          : null,
        Devotee: task.assignee?.name || null,
        Email: task.assignee?.emailAddress || null,
        'Upload Link': lastVersionKey
          ? trackEditingVersionOutputLink(task.id, lastVersionKey)
          : null,
        'Upload Date': lastVersionKey
          ? DateTimeConverter.toSerialDate(
              DateTime.fromMillis(task.versions[lastVersionKey].timestamp)
            )
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
    });
  }

  private getTaskRef(taskId: string) {
    return tasksRef.child(taskId);
  }

  public async getTask(taskId: string) {
    const snapshot = await this.getTaskRef(taskId).once('value');
    return snapshot.exists()
      ? <TrackEditingTask>{ id: taskId, ...snapshot.val() }
      : null;
  }

  public async getTasks(taskIds: string[]) {
    return await Promise.all(taskIds.map(async taskId => this.getTask(taskId)));
  }

  public async save(...tasks: IdentifiableTask[]) {
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

  private async saveToDatabase(tasks: IdentifiableTask[]) {
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
    await (await this.allotmentsSheet()).updateOrAppendRows(
      'Task ID',
      this.mapToRows(tasks)
    );
  }

  public async importTasks() {
    const tasksSheet = await Spreadsheet.open<ChunkRow>(
      functions.config().te.spreadsheet.id,
      'Tasks'
    );

    const tasks = _.chain(await tasksSheet.getRows())
      // Skip empty rows
      .filter(row => !!row['File Name'])
      // Skip first rows without Task ID
      .dropWhile(row => !row['Output File Name'])
      // Group chunks of one task together
      .reduce((accumulator, row) => {
        if (row['Output File Name']) accumulator.push([]);
        accumulator[accumulator.length - 1].push(row);
        return accumulator;
      }, new Array<Array<ChunkRow>>())
      // Validate rows
      .filter(taskRows => {
        const validationResult = new TaskValidator().validate(taskRows);
        if (!validationResult.isValid)
          console.info(
            `${taskRows[0]['Output File Name']}:`,
            validationResult.messages
          );
        return validationResult.isValid;
      })
      // Convert the rows into the tasks
      .map(taskRows => ({
        id: taskRows[0]['Output File Name'].trim(),
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

  public async syncAllotments() {
    const mode = (await baseRef.child('sync/mode').once('value')).val();
    if ((mode || 'off') === 'off') {
      console.info('Sync is off, see /TE/sync/mode.');
      return;
    }

    const shouldWrite = mode === 'on';

    /// Getting spreadsheet rows and database snapshot in parallel
    const [allotmentRows, snapshot] = await Promise.all([
      (await this.allotmentsSheet()).getRows(),
      tasksRef.once('value'),
    ]);

    const allotmentsFromSpreadsheet = this.mapFromRows(allotmentRows);

    const idsInSpreadsheet = new Set(
      _.map(allotmentsFromSpreadsheet, ({ id }) => id)
    );

    const tasksFromDatabase = _.chain(snapshot.val())
      .mapValues((source, id) => <TrackEditingTask>{ id, ...source })
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
      .map(({ id, status, assignee }) => ({
        id,
        assignee,
        status,
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
