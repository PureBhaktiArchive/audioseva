import { DateTime } from "luxon";
import { convertFromSerialDate, convertToSerialDate, extractListFromFilename } from "../src/helpers";

describe('List extraction', () => {
  test.each`
    fileName        | list
    ${'HI445A'}     | ${'ML1'}
    ${'ML2-1A (2)'} | ${'ML2'}
    ${'SER-88A'}    | ${'SER'}
    ${'19960528LEICESTER_T36'} | ${null}
  `('extracts $list from $fileName', ({ fileName, list }) => {
    expect(extractListFromFilename(fileName)).toEqual(list);
  });
});

describe('Date conversion', () => {
  test.each`
    serialDate              | iso
    ${43379}                | ${'2018-10-06T00:00:00+05:30'}
    ${   60.6506944444445}  | ${'1900-02-28T15:37:00+05:30'}
    ${   60.6506944560185}  | ${'1900-02-28T15:37:00.001+05:30'}
  `('converts between $serialDate and $iso', ({ serialDate, iso }) => {
    const datetime = DateTime.fromISO(iso, { setZone: true });
    expect(convertFromSerialDate(serialDate, datetime.zoneName)).toEqual(datetime);
    expect(convertToSerialDate(datetime)).toBeCloseTo(serialDate, 8);
  });
});
