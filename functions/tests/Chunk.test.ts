/*
 * sri sri guru gauranga jayatah
 */

import { Chunk, Resolution } from '../src/classes/Chunk';
import _ = require('lodash');

describe.each`
  Audio File Name | Beginning              | Ending           | Continuation From | Fidelity Check Resolution
  ${'BR-05A'}     | ${'00:00'}             | ${'47:11'}       | ${null}           | ${'OK'}
  ${'BR-08B'}     | ${'01:00'}             | ${'28:08'}       | ${'BR-08A'}       | ${'OK'}
  ${'BR-08B'}     | ${'0.835416666666667'} | ${'1.953472222'} | ${null}           | ${'OK'}
  ${'BR-09B'}     | ${null}                | ${null}          | ${null}           | ${'Haribol'}
`('Chunk importing from spreadsheet', row => {
  const chunk = Chunk.createFromRow(row);

  it(`${row['Audio File Name']}`, () => {
    expect(chunk.fileName).toBe(row['Audio File Name']);

    expect(chunk.continuationFrom).toBe(row['Continuation From']);

    if (row['Languages'])
      expect(chunk.languages).toEqual(
        _(row['Languages'])
          .split(',')
          .map(_.trim)
          .value()
      );
    else expect(chunk.languages).toEqual([]);
  });
});

describe.each([
  [
    new Chunk({
      fileName: 'BR-005A',
      beginning: 0,
      ending: 37,
      resolution: Resolution.Ok,
    }),
    [],
  ],
  [
    new Chunk({
      fileName: 'BR-006B',
      beginning: 108,
      ending: 108,
      resolution: Resolution.Ok,
    }),
    ['Beginning is equal to Ending'],
  ],
  [
    new Chunk({
      fileName: 'BR-006B',
      resolution: <Resolution>'Haribol',
    }),
    [
      `Invalid resolution 'Haribol'`,
      'Beginning is incorrect',
      'Ending is incorrect',
    ],
  ],
])('Chunk validation', (chunk: Chunk, warnings: string[]) => {
  it('should return warnings', () => {
    expect(chunk.warnings).toEqual(warnings);
  });
});
