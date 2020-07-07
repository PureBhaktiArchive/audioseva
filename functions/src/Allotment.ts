import { Person } from './Person';

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

export interface Allotment {
  assignee?: Person;
  status: AllotmentStatus;
  notes?: string;
  timestampGiven?: number;
  timestampDone?: number;
}

export const isActiveAllotment = (allotment: Allotment): boolean =>
  ![AllotmentStatus.Spare, AllotmentStatus.Done].includes(allotment.status);
