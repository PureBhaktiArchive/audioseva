/*!
 * sri sri guru gauranga jayatah
 */

import { database } from 'firebase-admin';
import { Allotment, AllotmentStatus, allotmentValidator } from './Allotment';
import { AllotmentRow } from './AllotmentRow';
import { DateTimeConverter } from './DateTimeConverter';
import { flatten } from './flatten';
import { Spreadsheet } from './Spreadsheet';
import _ = require('lodash');

export abstract class AbstractRepository<
  TRow extends AllotmentRow,
  TIdColumn extends keyof TRow & string,
  // TTask extends Allotment & { [id in TId]: string },
  TId extends string
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

  protected mapFromRows = (
    rows: TRow[]
  ): (Allotment & { [id in TId]: string })[] =>
    rows?.map(
      (row) =>
        ({
          [this.idPropertyName]: row[this.idColumnName],
          status:
            (row.Status?.trim() as AllotmentStatus) || AllotmentStatus.Spare,
          timestampGiven: row['Date Given']
            ? DateTimeConverter.fromSerialDate(row['Date Given']).toMillis()
            : null,
          timestampDone: row['Date Done']
            ? DateTimeConverter.fromSerialDate(row['Date Done']).toMillis()
            : null,
          assignee: {
            name: row.Devotee?.trim() || null,
            emailAddress: row.Email?.trim() || null,
          },
        } as Allotment & { [id in TId]: string })
    );

  protected abstract mapToRows(
    tasks: (Allotment & { [id in TId]: string })[]
  ): TRow[];

  protected getTaskRef = (id: string) => this.allotmentsRef.child(id);

  public async getTask(
    id: string
  ): Promise<Allotment & { [id in TId]: string }> {
    const snapshot = await this.getTaskRef(id).once('value');
    return snapshot.exists() ? this.constructTask(id, snapshot.val()) : null;
  }

  protected constructTask(
    id: string,
    data
  ): Allotment & { [id in TId]: string } {
    return { [this.idPropertyName]: id, ...data };
  }

  public async getTasks(ids: string[]) {
    return await Promise.all(ids.map(async (id) => this.getTask(id)));
  }

  public async save(...tasks: { [id in TId]: string }[]) {
    await this.saveToDatabase(tasks);

    const updatedTasks = await this.getTasks(
      tasks.map((task) => task[this.idPropertyName])
    );

    await this.saveToSpreadsheet(updatedTasks);
    return updatedTasks;
  }

  public async saveToDatabase(tasks: { [id in TId]: string }[]) {
    await this.allotmentsRef.update(
      flatten(
        _.zipObject(
          tasks.map((task) => task[this.idPropertyName]),
          tasks.map((task) => _.omit(task, this.idPropertyName))
        )
      )
    );
  }

  public async saveToSpreadsheet(
    tasks: (Allotment & { [id in TId]: string })[]
  ) {
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
            (taskFromDatabase?.assignee?.emailAddress || null)
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

        return true;
      })
      // Type casting is required to pass this successfully to `saveToDatabase`.
      // Asked question https://stackoverflow.com/q/63216805/3082178
      .value();

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
