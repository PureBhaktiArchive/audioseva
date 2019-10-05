/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { createSchema, morphism } from 'morphism';
import { DateTimeConverter } from '../DateTimeConverter';
import { RequireOnly } from '../helpers';
import { ReportingTask } from '../ReportingTask';
import { Spreadsheet } from '../Spreadsheet';
import admin = require('firebase-admin');
import _ = require('lodash');

export type IdentifyableTask = RequireOnly<ReportingTask, 'fileName'>;

const baseRef = admin.database().ref(`/SQR`);
const allotmentsRef = baseRef.child(`allotments`);

export class TasksRepository {
  static async open() {
    const repository = new TasksRepository();
    await repository.open();
    return repository;
  }

  private sheet: Spreadsheet;

  public async open() {
    this.sheet = await Spreadsheet.open(
      functions.config().sqr.spreadsheet_id,
      'Allotments'
    );
  }

  private rowToObjectSchema = createSchema<IdentifyableTask>({
    fileName: 'File Name',
    status: 'Status',
    timestampGiven: ({ 'Date Given': date }) =>
      DateTimeConverter.fromSerialDate(date).toMillis(),
    timestampDone: ({ 'Date Done': date }) =>
      DateTimeConverter.fromSerialDate(date).toMillis(),
    assignee: ({ Devotee: name, Email: emailAddress }) => ({
      name,
      emailAddress,
    }),
  });

  private objectToRowSchema = createSchema<any, IdentifyableTask>({
    'File Name': 'fileName',
    Status: 'status',
    'Date Given': ({ timestampGiven }) =>
      DateTimeConverter.toSerialDate(DateTime.fromMillis(timestampGiven)),
    'Date Done': ({ timestampGiven: timestampDone }) =>
      DateTimeConverter.toSerialDate(DateTime.fromMillis(timestampDone)),
    Devotee: 'assignee.name',
    Email: 'assignee.emailAddress',
  });

  private getTaskRef(fileName: string) {
    return allotmentsRef.child(fileName);
  }

  public async getTask(fileName: string) {
    const snapshot = await this.getTaskRef(fileName).once('value');
    if (!snapshot.exists())
      throw new Error(`SQR task for ${fileName} does not exist.`);

    return new ReportingTask(fileName, snapshot.val());
  }

  public async getTasks(fileNames: string[]) {
    return await Promise.all(
      fileNames.map(async fileName => this.getTask(fileName))
    );
  }

  public async getUserAllotments(emailAddress: string) {
    const snapshot = await allotmentsRef
      .orderByChild('assignee/emailAddress')
      .equalTo(emailAddress)
      .once('value');
    return (
      _.chain(snapshot.val())
        .toPairs()
        // Considering only ones with Given Timestamp, as after cancelation the assignee can be kept.
        .filter(([, value]) => Number.isInteger(value.timestampGiven))
        .map<ReportingTask>(
          ([fileName, item]) => new ReportingTask(fileName, item)
        )
        .value()
    );
  }

  public async save(...tasks: IdentifyableTask[]) {
    await allotmentsRef.update(
      _.chain(tasks)
        .flatMap(task =>
          _(task)
            .omit(task, 'fileName')
            .map((value, key) => [`${task.fileName}/${key}`, value])
            .value()
        )
        .fromPairs()
        .value()
    );

    const updatedTasks = await this.getTasks(
      tasks.map(({ fileName }) => fileName)
    );

    const rows = morphism(this.objectToRowSchema, updatedTasks);
    await this.sheet.updateOrAppendRows(
      <string>this.rowToObjectSchema.fileName,
      rows
    );
    return updatedTasks;
  }
}
