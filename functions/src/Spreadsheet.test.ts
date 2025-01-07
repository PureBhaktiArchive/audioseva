/*!
 * sri sri guru gauranga jayatah
 */

import { Spreadsheet } from './Spreadsheet';

describe('Spreadsheet.toA1Notation', () => {
  test.each`
    c1           | r1           | c2           | r2           | result
    ${'A'}       | ${1}         | ${'B'}       | ${3}         | ${'A1:B3'}
    ${'A'}       | ${1}         | ${'B'}       | ${undefined} | ${'A1:B'}
    ${undefined} | ${1}         | ${undefined} | ${3}         | ${'1:3'}
    ${'B'}       | ${undefined} | ${'N'}       | ${undefined} | ${'B:N'}
    ${'M'}       | ${4}         | ${undefined} | ${undefined} | ${'M4'}
  `('Sheet $c1 $r1 $c2 $r2 → $result', ({ c1, r1, c2, r2, result }) => {
    expect(Spreadsheet.toA1Notation('Sheet', c1, r1, c2, r2)).toBe(
      `Sheet!${result}`
    );
  });
});
