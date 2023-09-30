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
        (row, index, rows) =>
          rows.findIndex((x) => x['Task ID'] === row['Task ID']) < index,
        'Duplicate Task ID.'
      ),
      new ValidationIssue(
        (row) => !row['Date (yyyymmdd format)'],
        'Date is mandatory.'
      ),
      new ValidationIssue(
        (row) =>
          row['Date (yyyymmdd format)'] &&
          row['Date (yyyymmdd format)'].toUpperCase() !== 'UNKNOWN' &&
          DateTimeConverter.standardizePseudoIsoDate(
            row['Date (yyyymmdd format)']
          ) === null,
        'Date should be in YYYYMMDD format or UNKNOWN.'
      ),
      new ValidationIssue(
        (row) => typeof row['Date uncertain'] !== 'boolean',
        'Date uncertain should be true/false.'
      ),
      new ValidationIssue((row) => !row['Location'], 'Location is mandatory.'),
      new ValidationIssue(
        (row) =>
          (!row['Location'] || row['Location'].toUpperCase() === 'UNKNOWN') &&
          row['Location uncertain'] === true,
        'Location uncertain is applicable only if Location is defined and not UNKNOWN.'
      ),
      new ValidationIssue(
        (row) => typeof row['Location uncertain'] !== 'boolean',
        'Location uncertain should be true/false.'
      ),
      new ValidationIssue((row) => !row['Category'], 'Category is mandatory.'),
      new ValidationIssue(
        (row) => !row['Lecture Language'],
        'Lecture Language is mandatory.'
      ),
      new ValidationIssue(
        (row) =>
          row['Lecture Language'] &&
          !/(\s*\w+\s*)(,\s*\w+\s*)*/.test(row['Lecture Language']),
        'Lecture Language should be a comma-separated list of languages.'
      ),
      new ValidationIssue(
        (row) =>
          row['Srila Gurudeva Timing'] < 0 || row['Srila Gurudeva Timing'] > 1,
        'Srila Gurudeva Timing should be 0-100%.'
      ),
      new ValidationIssue(
        (row) => !row['Sound Rating'],
        'Sound Rating is mandatory.'
      ),
      new ValidationIssue(
        (row) =>
          row['Sound Rating'] &&
          !/^(Good|Average|Low)$/.test(row['Sound Rating']),
        'Sound Rating should be Good, Average or Low.'
      ),
      new ValidationIssue(
        (row) => row['Done files'] !== true,
        'File is not Done in TE/SE.'
      ),
      new ValidationIssue(
        (row) => row['Srila Gurudeva Timing'] === 0 && !row['Other Guru-varga'],
        'Other Guru-varga is mandatory if Srila Gurudeva Timing is zero.'
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
        'Finalization Date should be after FC Date.'
      ),
      new ValidationIssue(
        (row) => typeof (row['Topics Ready'] || false) !== 'boolean',
        'Topics Ready should be true/false.'
      ),
    ]);
  }
}
