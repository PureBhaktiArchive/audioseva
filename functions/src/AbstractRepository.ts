/*!
 * sri sri guru gauranga jayatah
 */

import { database } from 'firebase-admin';
import { DateTime } from 'luxon';
import { Allotment, AllotmentStatus, allotmentValidator } from './Allotment';
import { AllotmentRow } from './AllotmentRow';
import { DateTimeConverter } from './DateTimeConverter';
import { RequireOnly } from './RequireOnly';
import { Spreadsheet } from './Spreadsheet';
import { flatten } from './flatten';
import _ = require('lodash');

type BaseTask<TId extends string> = Allotment & Record<TId, string>;

export abstract class AbstractRepository<
  TRow extends AllotmentRow,
  TTask extends BaseTask<TId>,
  TId extends keyof TTask & string,
  TIdColumn extends keyof TRow & string,
> {
  constructor(
    private readonly spreadsheetId: string,
    private readonly idPropertyName: TId,
    private readonly idColumnName: TIdColumn,
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

  protected mapFromRows = (rows: TRow[]): BaseTask<TId>[] =>
    rows.map(
      ({
        [this.idColumnName]: id,
        Status: status,
        'Date Given': dateGiven,
        'Date Done': dateDone,
        Devotee: name,
        Email: emailAddress,
      }) =>
        ({
          [this.idPropertyName]: id,
          status: (status?.trim() as AllotmentStatus) || AllotmentStatus.Spare,
          timestampGiven: dateGiven
            ? DateTimeConverter.fromSerialDate(dateGiven).toMillis()
            : null,
          timestampDone: dateDone
            ? DateTimeConverter.fromSerialDate(dateDone).toMillis()
            : null,
          assignee: {
            name: name?.trim() || null,
            emailAddress: emailAddress?.trim() || null,
          },
        }) as BaseTask<TId>
    );

  protected mapAllotment = (task: TTask): AllotmentRow => ({
    [this.idColumnName]: task[this.idPropertyName],
    Status:
      task.status === undefined
        ? undefined
        : task.status === AllotmentStatus.Spare
          ? null
          : task.status,
    'Date Given': task.timestampGiven
      ? DateTimeConverter.toSerialDate(DateTime.fromMillis(task.timestampGiven))
      : null,
    'Date Done': task.timestampDone
      ? DateTimeConverter.toSerialDate(DateTime.fromMillis(task.timestampDone))
      : null,
    Devotee: task.assignee?.name || null,
    Email: task.assignee?.emailAddress || null,
  });

  protected abstract mapTask(task: TTask): TRow;
  protected mapToRows = (tasks: TTask[]): TRow[] =>
    tasks.map((task) => ({
      ...this.mapAllotment(task),
      ...this.mapTask(task),
    }));

  protected getTaskRef = (id: string) => this.allotmentsRef.child(id);

  public async getTask(id: string): Promise<TTask> {
    const snapshot = await this.getTaskRef(id).once('value');
    return snapshot.exists() ? this.constructTask(id, snapshot.val()) : null;
  }

  protected constructTask(id: string, data): TTask {
    return { [this.idPropertyName]: id, ...data } as TTask;
  }

  public async getTasks(ids: string[]) {
    return await Promise.all(ids.map(async (id) => this.getTask(id)));
  }

  public async save(...tasks: RequireOnly<TTask, TId>[]) {
    await this.saveToDatabase(tasks);

    const updatedTasks = await this.getTasks(
      tasks.map((task) => task[this.idPropertyName])
    );

    await this.saveToSpreadsheet(updatedTasks);
    return updatedTasks;
  }

  public async saveToDatabase(tasks: RequireOnly<TTask, TId>[]) {
    await this.allotmentsRef.update(
      flatten(
        _.zipObject(
          tasks.map((task) => _.get(task, this.idPropertyName)),
          _.map(tasks, (task) => _.omit(task, this.idPropertyName))
        )
      )
    );
  }

  public async saveToSpreadsheet(tasks: TTask[]) {
    await (
      await this.allotmentsSheet()
    ).updateOrAppendRows(this.idColumnName, this.mapToRows(tasks));
  }

  public get syncModeRef() {
    return this.allotmentsRef.parent.child('/sync/mode');
  }

  /**
   * Syncs allotments data between the spreadsheet and database.
   * - Adds missing tasks to the spreadsheet.
   * - Updates `status`, `assignee` and `timestampGiven` from the spreadsheet to the database.
   */
  public async syncAllotments({ createTasksInDatabase = false } = {}) {
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
      tasksFromSpreadsheet.map((task) => task[this.idPropertyName])
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

    const tasksForDatabase = tasksFromSpreadsheet.filter(
      (taskFromSpreadsheet) => {
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
            (taskFromDatabase?.assignee?.emailAddress || null)
        )
          return false;

        /// Checking the sanity of the spreadsheet data
        const validationResult =
          allotmentValidator.validate(taskFromSpreadsheet);
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

        return true;
      }
      // Type casting is required to pass this successfully to `saveToDatabase`.
      // Asked question https://stackoverflow.com/q/63216805/3082178
      // It is also discussed in https://stackoverflow.com/q/56788853/3082178
    ) as RequireOnly<TTask, TId>[];

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
