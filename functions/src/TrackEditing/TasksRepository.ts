/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { AbstractRepository } from '../AbstractRepository';
import { AllotmentStatus } from '../Allotment';
import { AudioChunk } from '../AudioChunk';
import { DateTimeConverter } from '../DateTimeConverter';
import { FileVersion } from '../FileVersion';
import { trackEditingVersionOutputLink } from '../Frontend';
import { Spreadsheet } from '../Spreadsheet';
import { ChunkRow } from './ChunkRow';
import { RecheckRow } from './RecheckRow';
import { TaskValidator } from './TaskValidator';
import { TrackEditingAllotmentRow } from './TrackEditingAllotmentRow';
import { TrackEditingTask } from './TrackEditingTask';
import admin = require('firebase-admin');
import _ = require('lodash');

const baseRef = admin.database().ref(`/TE`);
const tasksRef = baseRef.child(`tasks`);

export class TasksRepository extends AbstractRepository<
  TrackEditingAllotmentRow,
  TrackEditingTask,
  'id'
> {
  constructor() {
    super(functions.config().te.spreadsheet.id, 'id', 'Task ID', tasksRef);
  }

  protected mapToRows(tasks: TrackEditingTask[]): TrackEditingAllotmentRow[] {
    return tasks.map((task) => {
      const lastVersionKey = _.findLastKey(task.versions);
      const lastResolvedVersion = _.findLast(
        task.versions,
        (version) => !!version.resolution
      );

      return {
        'Task ID': task.id,
        'SEd?': task.isRestored ? 'SEd' : 'non-SEd',
        Status:
          task.status === undefined
            ? undefined
            : task.status === AllotmentStatus.Spare
            ? null
            : task.status,
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
      functions.config().te.spreadsheet.id,
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

  public async getRecheckedTasksUpdates() {
    const recheckSheet = await Spreadsheet.open<RecheckRow>(
      functions.config().te.spreadsheet.id,
      'Recheck files'
    );

    /// Getting spreadsheet rows and database snapshot in parallel
    const [rows, snapshot] = await Promise.all([
      recheckSheet.getRows(),
      tasksRef.once('value'),
    ]);

    const existingTasks = _.chain(snapshot.val())
      .mapValues((value, key) => this.constructTask(key, value))
      .value();

    const updates = _.chain(rows)
      // Skip empty rows and not yet rechecked
      .filter((row) => !!row['Task ID'] && !!row['Date checked'])
      .map<Pick<TrackEditingTask, 'id' | 'status' | 'assignee' | 'versions'>>(
        (row) => {
          const id = row['Task ID'];
          const existingTask = existingTasks[id];

          if (!existingTask) {
            console.warn(`Task ${id} is not found in the database.`);
            return null;
          }

          if (existingTask.status !== AllotmentStatus.Recheck) {
            return null;
          }

          if (row.Feedback === 'OK') {
            console.log(`Marking rechecked task ${id} as Done.`);
            return {
              id,
              status: AllotmentStatus.Done,
            };
          }

          if (!row['New assignee email']) {
            console.log(`${id}: skipping as new assignee email is not set.`);
            return null;
          }

          // Adding fake version if none exists
          if (!existingTask.versions)
            console.info(
              `There is no version in task ${id}, will add a fake one.`
            );

          const latestVersionKey =
            _.findLastKey(existingTask.versions) ||
            this.getNewVersionRef(id).key;

          const latestVersion = existingTask.versions?.[latestVersionKey] || {
            timestamp:
              existingTask.timestampDone || DateTime.local().toMillis(),
            uploadPath: null,
          };

          const latestResolution = latestVersion?.resolution;

          // Removing the resolution if it exists and is approving
          if (latestResolution)
            if (latestResolution.isApproved) {
              console.info(
                `${id}: will replace “Approved” resolution in version ${latestVersionKey}`,
                `added by ${latestResolution.author?.name}`,
                `on ${DateTime.fromMillis(latestResolution.timestamp).toHTTP()}`
              );
              latestVersion.resolution = {
                author: {
                  name: row['Rechecked by'],
                  emailAddress: row['Rechecked by'],
                },
                isApproved: false,
                feedback: row.Feedback,
                timestamp: DateTimeConverter.fromSerialDate(
                  row['Date checked']
                ).toMillis(),
              };
            } else
              console.warn(
                `${id}: Will not remove “Disapproved” resolution from version ${latestVersionKey}.`
              );

          return {
            id,
            status: AllotmentStatus.WIP,
            assignee: {
              name: row['New assignee email'],
              emailAddress: row['New assignee email'],
            },
            versions: { [latestVersionKey]: latestVersion },
          };
        }
      )
      .filter()
      .value();
    return updates;
  }
}
