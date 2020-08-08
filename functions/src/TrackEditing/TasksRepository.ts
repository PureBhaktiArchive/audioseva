/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { AbstractRepository } from '../AbstractRepository';
import { Allotment, AllotmentStatus } from '../Allotment';
import { AudioChunk } from '../AudioChunk';
import { DateTimeConverter } from '../DateTimeConverter';
import { FileVersion } from '../FileVersion';
import { trackEditingVersionOutputLink } from '../Frontend';
import { Person } from '../Person';
import { Spreadsheet } from '../Spreadsheet';
import { StorageManager } from '../StorageManager';
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

    const aliasToPerson = new Map(
      await Promise.all(
        _.map(
          (
            await admin
              .database()
              .ref('/users')
              // Filtering only those with filled `alias`: https://stackoverflow.com/a/39148596/3082178
              .orderByChild('alias')
              .startAt('!')
              .endAt('~')
              .once('value')
          ).val(),
          async (record, uid): Promise<[string, Person]> => [
            record.alias as string,
            {
              uid,
              name: (await admin.auth().getUser(uid)).displayName,
              emailAddress: record.emailAddress,
            } as Person,
          ]
        )
      )
    );

    type Update = Pick<TrackEditingTask, 'id' | keyof Allotment | 'versions'>;

    const updates = rows.map<Promise<Update>>(async (row) => {
      const id = row['Task ID'];
      // Skip empty rows and not yet rechecked
      if (!id || !row['Date checked']) return null;

      const existingTask = existingTasks[id];

      if (existingTask?.status !== AllotmentStatus.Recheck) {
        console.error(
          `${id}: skipping because it has status ${existingTask?.status}.`
        );
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

      // Adding a fake version if none exists
      const latestVersionKey =
        _.findLastKey(existingTask.versions) || this.getNewVersionRef(id).key;

      const latestVersion = existingTask.versions?.[latestVersionKey];

      if (latestVersion?.resolution?.isApproved === false) {
        console.warn(
          `${id}: skipping as the latest resolution is “Disapproved”.`
        );
        return null;
      }

      // Final file could be sound engineered before rechecked, thus searching for it in both buckets
      const finalFile = await StorageManager.findExistingFile(
        StorageManager.getFile('restored', id),
        StorageManager.getFile('edited', id)
      );

      if (!finalFile) {
        console.error(
          `${id}: could not find final file neither in “restored” nor in “edited” bucket.`
        );
        return null;
      }

      // Getting the final file generation
      // https://googleapis.dev/nodejs/storage/latest/File.html#getMetadata-examples
      const [finalFileMetadata] = await finalFile.getMetadata();

      const newAssignee = await admin
        .auth()
        .getUserByEmail(row['New assignee email'])
        .catch((error) => {
          if (error.code !== 'auth/user-not-found') throw error;
        });

      if (!newAssignee) {
        console.error(
          `${id}: could not find user ${row['New assignee email']}.`
        );
        return null;
      }

      // Logging just in case to have the previous state of the task
      console.info(`${id}: current state of the task is`, existingTask);

      return {
        id,
        status: AllotmentStatus.WIP,
        timestampGiven: admin.database.ServerValue.TIMESTAMP as number,
        timestampDone: null,
        assignee: {
          name: newAssignee.displayName,
          emailAddress: newAssignee.email,
        },
        versions: {
          [latestVersionKey]: {
            ...latestVersion,
            file: {
              bucket: finalFile.bucket.name,
              name: finalFile.name,
              generation: finalFileMetadata.generation as number,
            },
            resolution: {
              author: aliasToPerson.get(row['Rechecked by']) || {
                name: row['Rechecked by'],
                emailAddress: row['Rechecked by'],
              },
              isApproved: false,
              isRechecked: true,
              feedback: `[RECHECK]: ${row.Feedback}`,
              timestamp: DateTimeConverter.fromSerialDate(
                row['Date checked']
              ).toMillis(),
            },
          },
        },
      };
    });
    return _.filter(await Promise.all(updates));
  }
}
