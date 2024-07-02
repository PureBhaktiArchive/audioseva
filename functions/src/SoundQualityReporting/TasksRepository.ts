/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { AbstractRepository } from '../AbstractRepository';
import { isActiveAllotment } from '../Allotment';
import { ReportingAllotmentRow } from '../ReportingAllotmentRow';
import { ReportingTask } from '../ReportingTask';
import { SpareFile } from './SpareFile';
import admin = require('firebase-admin');
import _ = require('lodash');

export class TasksRepository extends AbstractRepository<
  ReportingAllotmentRow,
  ReportingTask,
  'fileName',
  'File Name'
> {
  constructor() {
    super(
      functions.config().sqr.spreadsheet_id as string,
      'fileName',
      'File Name',
      admin.database().ref(`/SQR`).child(`allotments`)
    );
  }

  protected mapTask = (task: ReportingTask): ReportingAllotmentRow => ({
    'File Name': task.fileName,
  });

  public async getLists() {
    return _(await this.getRows())
      .filter(_.negate(_.property('Status')))
      .filter('List')
      .map('List')
      .uniq()
      .value();
  }

  public async getSpareFiles(list: string, languages: string[], count: number) {
    return _(await this.getRows())
      .filter(
        (item) =>
          !item['Status'] &&
          item['List'] === list &&
          languages.includes(item['Language'] || 'None')
      )
      .map<SpareFile>((item) => ({
        name: item['File Name'],
        list: item['List'],
        serial: item['Serial'],
        notes:
          (item['Notes'] || '') +
          (item['Devotee']
            ? ` Devotee column is not empty: ${item['Devotee']}`
            : ''),
        language: item['Language'],
        date: item['Serial'],
      }))
      .take(count || 20)
      .value();
  }

  public async getUserAllotments(emailAddress: string) {
    const snapshot = await this.allotmentsRef
      .orderByChild('assignee/emailAddress')
      .equalTo(emailAddress)
      .once('value');

    return (
      _.chain(snapshot.val())
        .toPairs()
        // Considering only ones with Given Timestamp, as after cancelation the assignee can be kept.
        .filter(([, value]) => Number.isInteger(value.timestampGiven))
        .map<ReportingTask>(
          ([fileName, item]) => ({ fileName, ...item }) as ReportingTask
        )
        .value()
    );
  }

  public async getCurrentSet(emailAddress: string) {
    return (await this.getUserAllotments(emailAddress)).filter((item) =>
      isActiveAllotment(item)
    );
  }
}
