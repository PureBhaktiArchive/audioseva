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
        // Coalescing to empty string due to “not bug” https://stackoverflow.com/q/2430578/3082178
        (row) => !/^\w+$/.test((row['Category'] ?? '').toString().trim()),
        'Category should be one word.'
      ),
      new ValidationIssue(
        (row) =>
          !/(\s*\w+\s*)(,\s*\w+\s*)*/.test(
            (row['Lecture Language'] ?? '').toString().trim()
          ),
        'Languages should be a comma-separated list of words.'
      ),
      new ValidationIssue(
        (row) =>
          row['Srila Gurudeva Timing'] < 0 || row['Srila Gurudeva Timing'] > 1,
        'Srila Gurudeva Timing is not valid: should be 0-100%.'
      ),
      new ValidationIssue(
        (row) =>
          !/^(Good|Average|Low)$/.test(
            (row['Sound Rating'] ?? '').toString().trim()
          ),
        'Sound Rating should be Good, Average or Low.'
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
        (row) =>
          row['Finalization Date'] &&
          row['Finalization Date'] <=
            (row['Topics Ready']
              ? row['FC Date']
              : row['FC Date without topics']),
        'Finalization Date is before FC Date.'
      ),
      new ValidationIssue(
        (row) => typeof (row['Topics Ready'] || false) !== 'boolean',
        'Invalid Topics Ready: should be true/false.'
      ),
    ]);
  }
}
