/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { createSchema, morphism } from 'morphism';
import { AllotmentStatus } from '../Allotment';
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
    'Date Done': ({ timestampDone }) =>
      timestampDone
        ? DateTimeConverter.toSerialDate(DateTime.fromMillis(timestampDone))
        : null,
    Devotee: 'assignee.name',
    Email: 'assignee.emailAddress',
  });

  private getTaskRef(fileName: string) {
    return allotmentsRef.child(fileName);
  }

  public async getTask(fileName: string) {
    const snapshot = await this.getTaskRef(fileName).once('value');
    return snapshot.exists()
      ? new ReportingTask(fileName, snapshot.val())
      : null;
  }

  public async getTasks(fileNames: string[]) {
    return await Promise.all(
      fileNames.map(async fileName => this.getTask(fileName))
    );
  }

  public async getLists() {
    const rows = await this.sheet.getRows();

    return rows
      .filter(item => !item['Status'] && item['List'])
      .map(item => item['List'])
      .filter((value, index, self) => self.indexOf(value) === index);
  }

  public async getSpareFiles(
    list: string,
    languages: string[],
    language: string,
    count: number
  ) {
    return _(await this.sheet.getRows())
      .filter(
        item =>
          !item['Status'] &&
          item['List'] === list &&
          (languages || [language]).includes(item['Language'] || 'None')
      )
      .map(item => ({
        name: item['File Name'],
        list: item['List'],
        serial: item['Serial'],
        notes:
          item['Notes'] + item['Devotee']
            ? ` Devotee column is not empty: ${item['Devotee']}`
            : '',
        language: item['Language'],
        date: item['Serial'],
      }))
      .take(count || 20)
      .value();
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
    await this.saveToDatabase(tasks);

    const updatedTasks = await this.getTasks(
      tasks.map(({ fileName }) => fileName)
    );

    await this.saveToSpreadsheet(updatedTasks);
    return updatedTasks;
  }

  private async saveToDatabase(tasks: IdentifyableTask[]) {
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
  }

  private async saveToSpreadsheet(tasks: ReportingTask[]) {
    const rows = morphism(this.objectToRowSchema, tasks);
    await this.sheet.updateOrAppendRows(
      <string>this.rowToObjectSchema.fileName,
      rows
    );
  }

  /**
   * Imports allotment statuses from the spreadsheet.
   * Coordinator is marking allotments as Done manually in the spreadsheet, so preiodically importing them.
   * To be replaced with labeling emails in Gmail mailbox.
   */
  public async importDoneStatuses() {
    const tasks = morphism(this.rowToObjectSchema, await this.sheet.getRows());

    await this.saveToDatabase(
      _.chain(tasks)
        .filter(
          ({ fileName, status }) =>
            !fileName.match(/[\.\[\]$#]/) && status === AllotmentStatus.Done
        )
        .map(t => _.pick(t, ['fileName', 'status', 'timestampDone']))
        .value()
    );
  }
}
