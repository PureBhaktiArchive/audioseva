/*
 * sri sri guru gauranga jayatah
 */
import { DateTime, Duration, Settings } from 'luxon';

const daysBetweenEpochs = 25569; // Number of days between December 30th 1899 and January 1st 1970
const hoursInDay = 24;
const minutesInHour = 60;
const minutesInDay = minutesInHour * hoursInDay;
const secondsInMinute = 60;
const secondsInHour = secondsInMinute * minutesInHour;
const secondsInDay = secondsInMinute * minutesInDay;
const millisInSecond = 1000;
const millisInMinute = millisInSecond * secondsInMinute;
const millisInHour = millisInMinute * minutesInHour;
const millisInDay = millisInHour * hoursInDay;

export class DateTimeConverter {
  /**
   * Converts serial date/time to the Luxon type, pinning it to the particular moment in the timeline.
   * @param serialDate Date and time in Google Sheets / Excel format, as a decimal number
   * @param timezone Time zone of the date and time
   */
  public static fromSerialDate(
    serialDate: number,
    timezone: string = Settings.defaultZoneName
  ): DateTime {
    // Calculating timestamp as if the source date was specified in UTC,
    // then setting the time zone as specified but keeping local time the same
    return DateTime.fromSeconds((serialDate - daysBetweenEpochs) * secondsInDay)
      .setZone('utc')
      .setZone(timezone, { keepLocalTime: true });
  }

  /**
   * Converts particular date/time into Excel/Sheets serial date value.
   * Because Excel/Sheets do not track the time zone, the local time of @datetime is converted.
   * @param datetime Luxon date/time object
   */
  public static toSerialDate(datetime: DateTime): number {
    // Setting the time zone to UTC but keeping local time the same,
    // then calculating the serial date as if the timestamp was specified in UTC
    return (
      datetime.setZone('utc', { keepLocalTime: true }).toSeconds() /
        secondsInDay +
      daysBetweenEpochs
    );
  }

  /**
   * Parses a duration.
   * @param timing duration in `[hh:]mm:ss` format or as a serial time from Excel/Sheets
   * @returns duration object
   */
  public static parseDuration(timing: string): Duration {
    // Treating the floating number as time portion of the serial date from Excel/Sheets.
    if (!isNaN(+timing)) {
      // Decimal part is the portion of a day.
      // Using minutes directly as Sheets misinterpret `mm:ss` format as `hh:mm`.
      const duration = Duration.fromMillis(
        Math.round(millisInDay * +timing)
      );
      return (duration.valueOf() >= millisInHour)? 
    }

    // Otherwise treating the string as human-readable format `[hh:]mm:ss`
    const match = /^\s*(?:(0?[1-3]):)?([0-5]?\d):([0-5]?\d)\s*$/.exec(timing);
    if (!match) return Duration.invalid('Incorrect format');
    const [, hours = 0, minutes = NaN, seconds = NaN] = match;
    return Duration.fromObject({
      seconds: +seconds,
      minutes: +minutes,
      hours: +hours,
    });
  }
}
