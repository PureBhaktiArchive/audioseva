/*
 * sri sri guru gauranga jayatah
 */
import { DateTime, Duration } from 'luxon';
import { DateTimeConverter } from '../src/classes/DateTimeConverter';

describe.each`
  serialDate          | iso
  ${43379}            | ${'2018-10-06T00:00:00+05:30'}
  ${60.6506944444445} | ${'1900-02-28T15:37:00+05:30'}
  ${60.6506944560185} | ${'1900-02-28T15:37:00.001+05:30'}
`('Conversion between $serialDate and $iso', ({ serialDate, iso }) => {
  const datetime = DateTime.fromISO(iso, { setZone: true });

  test('from Serial to DateTime', () => {
    expect(
      DateTimeConverter.fromSerialDate(serialDate, datetime.zoneName)
    ).toEqual(datetime);
  });

  test('from DateTime to Serial', () => {
    expect(DateTimeConverter.toSerialDate(datetime)).toBeCloseTo(serialDate, 8);
  });
});

describe('Duration parsing', () => {
  test.each`
    timing       | iso
    ${'23:03'}   | ${'PT23M3S'}
    ${'1:03:54'} | ${'PT1H3M54S'}
  `('parses $timing as $duration', ({ timing, iso }) => {
    expect(DateTimeConverter.durationFromHuman(timing).valueOf()).toEqual(
      Duration.fromISO(iso).valueOf()
    );
  });

  test.each`
    input
    ${'12.4'}
    ${'1:03:54:33'}
    ${'7:130'}
  `('returns invalid Duration for “$input”', ({ input }) => {
    const duration = DateTimeConverter.durationFromHuman(input);
    expect(duration.isValid).toBeFalsy();
    expect(duration.invalidReason).toEqual('Incorrect format');
  });
});
