/*
 * sri sri guru gauranga jayatah
 */
import { DateTime, Duration } from 'luxon';
import { DateTimeConverter } from './DateTimeConverter';

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

describe('Duration conversion', () => {
  test.each`
    timing       | iso             | formatted
    ${'12.4'}    | ${'PT12M4S'}    | ${'12:04'}
    ${'1.30.2'}  | ${'PT1H30M2S'}  | ${'1:30:02'}
    ${'23:03'}   | ${'PT23M3S'}    | ${null}
    ${'1:03:54'} | ${'PT1H3M54S'}  | ${null}
    ${'0:07:23'} | ${'PT7M23S'}    | ${'7:23'}
    ${'3:59:59'} | ${'PT3H59M59S'} | ${null}
    ${'5:59:59'} | ${'PT5H59M59S'} | ${null}
  `('parses $timing as $iso', ({ timing, iso, formatted }) => {
    expect(DateTimeConverter.durationFromHuman(timing).valueOf()).toEqual(
      Duration.fromISO(iso).valueOf()
    );

    expect(DateTimeConverter.durationToHuman(Duration.fromISO(iso))).toEqual(
      formatted || timing
    );
  });

  test.each`
    input
    ${'1:12.4'}
    ${'1.12:4'}
    ${'6:01:02'}
    ${'1:60:02'}
    ${'6:60'}
    ${'1:03:54:33'}
    ${'7:130'}
    ${'1320'}
    ${null}
    ${''}
    ${0.002777777777777778}
  `('returns invalid Duration for “$input”', ({ input }) => {
    const duration = DateTimeConverter.durationFromHuman(input);
    expect(duration.isValid).toBeFalsy();
    expect(duration.invalidReason).toEqual('Incorrect format');
  });
});

describe('Pseudo-ISO date', () => {
  it.each`
    input         | iso
    ${'19960422'} | ${'1996-04-22'}
    ${'19961100'} | ${'1996-11'}
    ${'19910000'} | ${'1991'}
  `('“$input” should be standardized as “$iso”', ({ input, iso }) => {
    expect(DateTimeConverter.standardizePseudoIsoDate(input)).toBe(iso);
  });

  it.each([
    '19910010', // Month undefined but day defined
    '19911310', // Non-existent month
    '19910230', // Non-existent day of February
    '19910132', // Non-existent day of January
    '199105', // No day, even zeros
    '2005-06-07', // Hyphens are not accepted
    null, // Should consume `null` gracefully
    undefined, // Should consume `undefined` gracefully
  ])('“%s” should not be recognized as a pseudo-ISO date', (input) => {
    expect(DateTimeConverter.standardizePseudoIsoDate(input)).toBeNull();
  });
});
