/*!
 * sri sri guru gauranga jayatah
 */

import { Allotment, AllotmentStatus } from './Allotment';
import { ValidationRule } from './validation/ValidationRule';
import { Validator } from './validation/Validator';

export class AllotmentValidator extends Validator<Allotment> {
  private static readonly rules = [
    new ValidationRule<Allotment>(
      (allotment) =>
        !(
          [
            AllotmentStatus.Given,
            AllotmentStatus.WIP,
            AllotmentStatus.Done,
          ].includes(allotment.status) && !allotment.assignee?.emailAddress
        ),
      'Active task is not assigned.'
    ),
    new ValidationRule<Allotment>(
      (allotment) =>
        !(
          allotment.status === AllotmentStatus.Spare &&
          !!allotment.assignee?.emailAddress
        ),
      'Spare task is assigned.'
    ),
  ];

  constructor() {
    super(AllotmentValidator.rules);
  }
}
