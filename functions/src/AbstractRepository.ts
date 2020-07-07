/*!
 * sri sri guru gauranga jayatah
 */

import { database } from 'firebase-admin';
import { createSchema, morphism, StrictSchema } from 'morphism';
import { Allotment, AllotmentStatus } from './Allotment';
import { AllotmentRow } from './AllotmentRow';
import { DateTimeConverter } from './DateTimeConverter';
import { RequireOnly } from './RequireOnly';
import { Spreadsheet } from './Spreadsheet';
import _ = require('lodash');

export abstract class AbstractRepository<
  TRow extends AllotmentRow,
  TTask extends Allotment & { [id in TId]: string },
  TId extends keyof TTask
> {
  constructor(
    private readonly spreadsheetId: string,
    private readonly idPropertyName: TId,
    private readonly idColumnName: string,
    private readonly allotmentsRef: database.Reference
  ) {}

  private _allotmentsSheet: Spreadsheet<TRow>;
  protected async allotmentsSheet() {
    this._allotmentsSheet =
      this._allotmentsSheet ||
      (await Spreadsheet.open(this.spreadsheetId, 'Allotments'));
    return this._allotmentsSheet;
  }

  protected async getRows(): Promise<TRow[]> {
    return (await this.allotmentsSheet()).getRows();
  }

  protected mapFromRows: (
    rows: TRow[]
  ) => Pick<TTask, TId | keyof Allotment>[] = morphism(
    createSchema<Pick<TTask, TId | keyof Allotment>, TRow>({
      [this.idPropertyName]: this.idColumnName,
      status: ({ Status: status }) =>
        (status?.trim() as AllotmentStatus) || AllotmentStatus.Spare,
      timestampGiven: ({ 'Date Given': date }) =>
        DateTimeConverter.fromSerialDate(date).toMillis(),
      timestampDone: ({ 'Date Done': date }) =>
        DateTimeConverter.fromSerialDate(date).toMillis(),
      assignee: ({ Devotee: name, Email: emailAddress }) => ({
        name: name?.trim() || null,
        emailAddress: emailAddress?.trim() || null,
      }),
    } as StrictSchema<Pick<TTask, TId | keyof Allotment>, TRow>)
  );

  protected abstract mapToRows(tasks: TTask[]): TRow[];

  protected getTaskRef = (id: string) => this.allotmentsRef.child(id);

  public async getTask(id: string): Promise<TTask> {
    const snapshot = await this.getTaskRef(id).once('value');
    return snapshot.exists() ? this.constructTask(id, snapshot.val()) : null;
  }

  private constructTask(id: string, data): TTask {
    return { [this.idPropertyName]: id, ...data } as TTask;
  }

  public async getTasks(ids: string[]) {
    return await Promise.all(ids.map(async (id) => this.getTask(id)));
  }

  public async save(...tasks: RequireOnly<TTask, TId>[]) {
    await this.saveToDatabase(tasks);

    const updatedTasks = await this.getTasks(
      _.map(tasks, (task) => _.get(task, this.idPropertyName))
    );

    await this.saveToSpreadsheet(updatedTasks);
    return updatedTasks;
  }

  public async saveToDatabase(tasks: RequireOnly<TTask, TId>[]) {
    await this.allotmentsRef.update(
      _.chain(tasks)
        .flatMap((task) =>
          _(task)
            .omit(this.idPropertyName)
            .map((value: unknown, key) => [
              `${task[this.idPropertyName]}/${key}`,
              value,
            ])
            .value()
        )
        .fromPairs()
        .value()
    );
  }

  public async saveToSpreadsheet(tasks: TTask[]) {
    await (await this.allotmentsSheet()).updateOrAppendRows(
      this.idColumnName,
      this.mapToRows(tasks)
    );
  }

  /**
   * Syncs allotments data between the spreadsheet and database.
   * - Adds missing tasks to the spreadsheet.
   * - Updates `status`, `assignee` and `timestampGiven` from the spreadsheet to the database.
   * @param dryRun Whether changes should be just printed, not saved.
   */
  public async syncAllotments({ dryRun = false } = {}) {
    /// Getting spreadsheet rows and database snapshot in parallel
    const [rows, snapshot] = await Promise.all([
      this.getRows(),
      this.allotmentsRef.once('value'),
    ]);

    const allotmentsFromSpreadsheet = this.mapFromRows(rows);

    const tasksFromDatabase = _.chain(snapshot.val())
      .mapValues((value, key) => this.constructTask(key, value))
      .value();

    /// Adding missing tasks from the database to the spreadsheet

    const idsInSpreadsheet = new Set(
      _.map(allotmentsFromSpreadsheet, (task) =>
        _.get(task, this.idPropertyName)
      )
    );

    const tasksForSpreadsheet = _.chain(tasksFromDatabase)
      .filter((task) => !idsInSpreadsheet.has(task[this.idPropertyName]))
      .forEach((task) => {
        console.info(
          `${dryRun ? 'DRY RUN' : null}`,
          `Adding missing task ${task[this.idPropertyName]}`,
          'into the spreadsheet.'
        );
      })
      .value();

    /// Updating allotment info from the spreadsheet to the database

    const tasksForDatabase = _.chain(allotmentsFromSpreadsheet)
      .filter((allotment) => {
        const task = tasksFromDatabase[allotment[this.idPropertyName]];

        if (!task) {
          console.info(
            `Task ${
              allotment[this.idPropertyName]
            } is not found in the database.`
          );
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
            `Task ${allotment[this.idPropertyName]}`,
            `has invalid data in the spreadsheet:`,
            `“${allotment.status} ${allotment.assignee?.emailAddress} ”.`,
            'Skipping.'
          );
          return false;
        }

        console.info(
          `${dryRun ? 'DRY RUN' : null}`,
          `Updating task ${task[this.idPropertyName]}`,
          'in the database',
          `from “${task.status} ${task.assignee?.emailAddress}”`,
          `to “${allotment.status} ${allotment.assignee?.emailAddress}”.`
        );

        return true;
      })
      .map(
        /// Updating only these fields
        ({ [this.idPropertyName]: id, status, assignee, timestampDone }) =>
          ({
            [this.idPropertyName]: id,
            status,
            assignee,
            timestampDone,
          } as RequireOnly<TTask, TId>)
      )
      .value();

    if (dryRun) console.log(`Doing nothing.`);
    else {
      console.log(`Updating spreadsheet and database.`);
      await Promise.all([
        this.saveToSpreadsheet(tasksForSpreadsheet),
        this.saveToDatabase(tasksForDatabase),
      ]);
    }
  }
}
