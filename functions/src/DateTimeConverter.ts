/*
 * sri sri guru gauranga jayatah
 */
import { DateTime, Duration, Settings } from 'luxon';

const daysBetweenEpochs = 25569; // Number of days between December 30th 1899 and January 1st 1970
const secondsInDay = 86400; // 24 * 60 * 60

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
   * Parses a human-entered timing in `[hh:]mm:ss` format.
   * @param timing duration in `[hh:]mm:ss` format
   * @returns duration object
   */
  public static durationFromHuman(timing: string): Duration {
    const match = /^\s*(?:(0?[0-3]):)?([0-5]?\d):([0-5]?\d)\s*$/.exec(timing);
    if (!match) return Duration.invalid('Incorrect format');
    const [, hours = 0, minutes = NaN, seconds = NaN] = match;
    return Duration.fromObject({
      seconds: +seconds,
      minutes: +minutes,
      hours: +hours,
    });
  }

  /**
   * Converts a duration to human format `[hh:]mm:ss`
   * @param duration Luxon Duration object
   * @returns Duration in `[hh:]mm:ss` format
   */
  public static durationToHuman(duration: Duration): string {
    return duration.as('hours') >= 1
      ? duration.toFormat('h:mm:ss')
      : duration.toFormat('m:ss');
  }

  public static humanToSeconds(timing: string): number {
    return this.durationFromHuman(timing).as('seconds');
  }

  public static secondsToHuman(seconds: number): string {
    return this.durationToHuman(Duration.fromObject({ seconds }));
  }
}
