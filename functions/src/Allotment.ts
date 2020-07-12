import { AllotmentValidator } from './AllotmentValidator';
import { Person } from './Person';
import { IValidator } from './validation/Validator';

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
  [AllotmentStatus.Given, AllotmentStatus.WIP].includes(allotment.status);

export const allotmentValidator: IValidator<Allotment> = new AllotmentValidator();
