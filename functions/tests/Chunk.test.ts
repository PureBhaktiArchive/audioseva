/*
 * sri sri guru gauranga jayatah
 */

import { Chunk, Resolution } from '../src/classes/Chunk';
import { DateTimeConverter } from '../src/classes/DateTimeConverter';
import _ = require('lodash');

describe.each`
  Audio File Name | Beginning  | Ending     | Continuation From | Date         | Location          | Category                                          | Topics                                     | Suggested Title                   | Languages           | Fidelity Check Resolution
  ${'BR-05A'}     | ${'00:00'} | ${'47:11'} | ${null}           | ${'?'}       | ${'Mathura Math'} | ${'More of questions and clarifications Darsana'} | ${'Gurudev clarified following questions'} | ${'Bhakti Queries'}               | ${'English, Hindi'} | ${'OK'}
  ${'BR-08B'}     | ${'01:00'} | ${'28:08'} | ${'BR-08A'}       | ${'unknown'} | ${'Not known'}    | ${'Lecture'}                                      | ${'-Gopis virah for Shri Krishna '}        | ${'Shri Krishna virah for gopis'} | ${'Hindi'}          | ${'OK'}
  ${'BR-09B'}     | ${null}    | ${null}    | ${null}           | ${null}      | ${null}           | ${null}                                           | ${null}                                    | ${null}                           | ${null}             | ${'Haribol'}
`('Chunk importing from spreadsheet', row => {
  const chunk = Chunk.createFromRow(row);

  it(`${row['Audio File Name']}`, () => {
    expect(chunk.fileName).toBe(row['Audio File Name']);

    expect(chunk.beginning).toBe(
      DateTimeConverter.durationFromHuman(row['Beginning']).as('seconds')
    );

    expect(chunk.ending).toBe(
      DateTimeConverter.durationFromHuman(row['Ending']).as('seconds')
    );

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
