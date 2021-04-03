/*!
 * sri sri guru gauranga jayatah
 */

import { DateTimeConverter } from '../DateTimeConverter';
import { ValidationIssue } from '../validation/ValidationRule';
import { Validator } from '../validation/Validator';
import { FidelityCheckRow } from './FidelityCheckRow';

export class FidelityCheckValidator extends Validator<FidelityCheckRow> {
  constructor() {
    super([
      new ValidationIssue(
        (row) => !Number.isFinite(row['Archive ID']),
        'No Archive ID.'
      ),
      new ValidationIssue(
        (row, index, rows) =>
          rows.findIndex((x) => x['Archive ID'] === row['Archive ID']) < index,
        'Duplicate Archive ID.'
      ),
      new ValidationIssue(
        (row, index, rows) =>
          rows.findIndex((x) => x['Task ID'] === row['Task ID']) < index,
        'Duplicate Task ID.'
      ),
      new ValidationIssue(
        (row) =>
          row['Date (yyyymmdd format)'] &&
          DateTimeConverter.standardizePseudoIsoDate(
            row['Date (yyyymmdd format)'].toString()
          ) === null,
        'Date is not valid: should be in YYYYMMDD format.'
      ),
      new ValidationIssue(
        (row) => typeof (row['Date uncertain'] || false) !== 'boolean',
        'Invalid Date uncertain: should be true/false.'
      ),
      new ValidationIssue(
        (row) => typeof (row['Location uncertain'] || false) !== 'boolean',
        'Invalid Location uncertain: should be true/false.'
      ),
      new ValidationIssue(
        (row) => !/^\w+$/.test(row['Lecture Language']?.trim()),
        'Category is not valid: should be one word.'
      ),
      new ValidationIssue(
        (row) =>
          !/(\s*\w+\s*)(,\s*\w+\s*)*/.test(row['Lecture Language']?.trim()),
        'Languages are not valid: should be a comma-separated list of words.'
      ),
      new ValidationIssue(
        (row) =>
          row['Srila Gurudeva Timing'] < 0 || row['Srila Gurudeva Timing'] > 1,
        'Srila Gurudeva Timing is not valid: should be 0-100%.'
      ),
      new ValidationIssue(
        (row) => !/^(Good|Average|Low)$/.test(row['Sound Rating']?.trim()),
        'Sound Rating is not valid: should be Good, Average or Low.'
      ),
      new ValidationIssue(
        (row) => row['Done files'] !== true,
        'File is not Done in TE/SE.'
      ),
      new ValidationIssue(
        (row) =>
          row['Fidelity Checked'] === true && !Number.isFinite(row['FC Date']),
        'Invalid FC Date.'
      ),
      new ValidationIssue(
        (row) =>
          row['Fidelity Checked without topics'] === true &&
          !Number.isFinite(row['FC Date without topics']),
        'Invalid FC Date without topics.'
      ),
      new ValidationIssue(
        (row) =>
          row['Ready For Archive'] === true &&
          !Number.isFinite(row['Finalization Date']),
        'Invalid Finalization Date.'
      ),
      new ValidationIssue(
        (row) => typeof (row['Topics Ready'] || false) !== 'boolean',
        'Invalid Topics Ready: should be true/false.'
      ),
    ]);
  }
}
