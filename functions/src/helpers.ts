import { DateTime, Settings } from 'luxon';

const daysBetweenEpochs = 25569; // Number of days between December 30th 1899 and January 1st 1970
const secondsInDay = 86400; // 24 * 60 * 60

/**
 * Converts serial date/time to the Luxon type, pinning it to the particular moment in the timeline.
 * @param serialDate Date and time in Google Sheets / Excel format, as a decimal number
 * @param timezone Time zone of the date and time
 */
export const convertFromSerialDate = (serialDate: number, timezone: string = Settings.defaultZoneName): DateTime => {
  // Calculating timestamp as if the source date was specified in UTC,
  // then setting the time zone as specified but keeping local time the same
  return DateTime
    .fromSeconds((serialDate - daysBetweenEpochs) * secondsInDay)
    .setZone('utc')
    .setZone(timezone, { keepLocalTime: true });
}

/**
 * Converts particular date/time into Excel/Sheets serial date value.
 * Because Excel/Sheets do not track the time zone, the local time of @datetime is converted.
 * @param datetime Luxon date/time object
 */
export const convertToSerialDate = (datetime: DateTime): number => {
  // Setting the time zone to UTC but keeping local time the same,
  // then calculating the serial date as if the timestamp was specified in UTC
  return datetime
    .setZone('utc', { keepLocalTime: true })
    .toSeconds() / secondsInDay + daysBetweenEpochs;
}

/**
 * Extract list from filename supplied as argument
 */
export const extractListFromFilename = (fileName: string): string => {
  const match = fileName.match(/^\w+(?=-)|Hi(?=\d)/i);
  if (!match)
    return null;

  const list = match[0].toUpperCase();
  return list === 'HI' ? 'ML1' : list;
};

export const taskIdRegex = '^[a-zA-Z]+-\\d+';

