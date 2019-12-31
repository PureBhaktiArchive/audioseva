import { DateTime } from 'luxon';
import { Person } from './Person';
import _ = require('lodash');

/*
 * sri sri guru gauranga jayatah
 */

export enum AllotmentStatus {
  Spare = 'Spare',
  Given = 'Given',
  WIP = 'WIP',
  Done = 'Done',
  AudioProblem = 'Audio Problem',
}

export class Allotment {
  assignee?: Person;
  status: AllotmentStatus;
  notes?: string;
  timestampGiven?: number;
  timestampDone?: number;
  token?: string;

  constructor(source: Partial<Allotment>) {
    Object.assign(
      this,
      _.pick(
        source,
        'assignee',
        'status',
        'notes',
        'timestampGiven',
        'timestampDone',
        'token'
      )
    );
  }

  public get dateTimeGiven(): DateTime {
    return DateTime.fromMillis(this.timestampGiven);
  }

  public get dateGiven(): Date {
    return this.dateTimeGiven.toJSDate();
  }

  public get daysPassed(): number {
    return DateTime.local()
      .diff(this.dateTimeGiven, ['days', 'hours'])
      .toObject().days;
  }

  public get isActive(): boolean {
    return ![AllotmentStatus.Spare, AllotmentStatus.Done].includes(this.status);
  }
}
