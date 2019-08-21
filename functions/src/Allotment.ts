import { DateTime } from 'luxon';
import { Assignee } from './Assignee';

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
  fileName: string;
  assignee: Assignee;
  status: AllotmentStatus;
  notes?: string;
  timestampGiven: number;
  timestampDone: number;
  token: string;

  constructor(fileName: string, source: Partial<Allotment>) {
    Object.assign(this, source);
    this.fileName = fileName;
  }

  public get dateTimeGiven(): DateTime {
    return DateTime.fromMillis(this.timestampGiven);
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
