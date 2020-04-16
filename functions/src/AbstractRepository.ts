/*!
 * sri sri guru gauranga jayatah
 */

import { database } from 'firebase-admin';
import { createSchema, morphism, StrictSchema } from 'morphism';
import { Allotment, AllotmentStatus, allotmentValidator } from './Allotment';
import { AllotmentRow } from './AllotmentRow';
import { DateTimeConverter } from './DateTimeConverter';
import { RequireOnly } from './RequireOnly';
import { Spreadsheet } from './Spreadsheet';
import flatten = require('flat');
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
        date ? DateTimeConverter.fromSerialDate(date).toMillis() : null,
      timestampDone: ({ 'Date Done': date }) =>
        date ? DateTimeConverter.fromSerialDate(date).toMillis() : null,
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
      flatten(
        _.zipObject(
          tasks.map((task) => _.get(task, this.idPropertyName)),
          _.map(tasks, (task) => _.omit(task, 'id'))
        ),
        { delimiter: '/' }
      )
    );
  }

  public async saveToSpreadsheet(tasks: TTask[]) {
    await (await this.allotmentsSheet()).updateOrAppendRows(
      this.idColumnName,
      this.mapToRows(tasks)
    );
  }

  public get syncModeRef() {
    return this.allotmentsRef.parent.child('/sync/mode');
  }

  /**
   * Syncs allotments data between the spreadsheet and database.
   * - Adds missing tasks to the spreadsheet.
   * - Updates `status`, `assignee` and `timestampGiven` from the spreadsheet to the database.
   */
  public async syncAllotments({
    createTasksInDatabase = false,
    incomingTaskModifier = undefined,
  }: SyncParameters<TTask, TId>) {
    const mode = (await this.syncModeRef.once('value')).val();
    if ((mode || 'off') === 'off') {
      console.info('Sync is off, see', this.syncModeRef);
      return;
    }

    const dryRun = mode !== 'on';

    /// Getting spreadsheet rows and database snapshot in parallel
    const [rows, snapshot] = await Promise.all([
      this.getRows(),
      this.allotmentsRef.once('value'),
    ]);

    const tasksFromSpreadsheet = this.mapFromRows(rows);

    const tasksFromDatabase = _.chain(snapshot.val())
      .mapValues((value, key) => this.constructTask(key, value))
      .value();

    /// Adding missing tasks from the database to the spreadsheet

    const idsInSpreadsheet = new Set(
      _.map(tasksFromSpreadsheet, (task) => _.get(task, this.idPropertyName))
    );

    const tasksForSpreadsheet = _.chain(tasksFromDatabase)
      .filter((task) => !idsInSpreadsheet.has(task[this.idPropertyName]))
      .forEach((task) => {
        console.info(
          `${dryRun ? 'DRY RUN' : ''}`,
          `Adding missing task ${task[this.idPropertyName]}`,
          'into the spreadsheet.'
        );
      })
      .value();

    /// Updating allotment info from the spreadsheet to the database

    const tasksForDatabase = _.chain(tasksFromSpreadsheet)
      .filter((taskFromSpreadsheet) => {
        const id = taskFromSpreadsheet[this.idPropertyName];

        if (id.match(/[.#$/[\]]/)) {
          console.warn(`Task ${id} contains invalid characters.`);
          return false;
        }

        const taskFromDatabase = tasksFromDatabase[id];

        if (!taskFromDatabase && !createTasksInDatabase) {
          console.warn(`Task ${id} is not found in the database.`);
          return false;
        }

        /// Updating only if any of these fields have changed
        if (
          taskFromSpreadsheet.status === taskFromDatabase?.status &&
          (taskFromSpreadsheet.assignee?.emailAddress || null) ===
            (taskFromDatabase.assignee?.emailAddress || null) &&
          (taskFromSpreadsheet.assignee?.name || null) ===
            (taskFromDatabase.assignee?.name || null)
        )
          return false;

        /// Checking the sanity of the spreadsheet data
        const validationResult = allotmentValidator.validate(
          taskFromSpreadsheet
        );
        if (!validationResult.isValid) {
          console.warn(
            `Task ${id} is not valid in the spreadsheet:`,
            validationResult.messages
          );
          return false;
        }

        console.info(
          `${dryRun ? 'DRY RUN' : ''}`,
          `Updating task ${id}`,
          'in the database',
          `from “${taskFromDatabase?.status} ${taskFromDatabase?.assignee?.emailAddress}”`,
          `to “${taskFromSpreadsheet.status} ${taskFromSpreadsheet.assignee?.emailAddress}”.`
        );

        // Allowing caller to modify the task before saving it into the database
        incomingTaskModifier?.(taskFromDatabase, taskFromSpreadsheet);

        return true;
      })
      // Type casting is required to pass this successfully to `saveToDatabase`.
      // Asked question https://stackoverflow.com/q/63216805/3082178
      .value() as RequireOnly<TTask, TId>[];

    if (dryRun) console.log(`DRY RUN, doing nothing.`);
    else {
      console.log(`Updating spreadsheet and database.`);
      await Promise.all([
        this.saveToSpreadsheet(tasksForSpreadsheet),
        this.saveToDatabase(tasksForDatabase),
      ]);
    }
  }
}

interface SyncParameters<TTask, TId extends keyof TTask> {
  createTasksInDatabase?: boolean;
  incomingTaskModifier?: (
    existingTask: Pick<TTask, TId>,
    incomingTask: Pick<TTask, TId>
  ) => void;
}
