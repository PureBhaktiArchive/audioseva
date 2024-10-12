/*
 * sri sri guru gauranga jayatah
 */
import { DateTime, Duration } from 'luxon';

const daysBetweenEpochs = 25569; // Number of days between December 30th 1899 and January 1st 1970
export const secondsInDay = 86400; // 24 * 60 * 60 Number of seconds in a day

export class DateTimeConverter {
  /**
   * Converts serial date/time to the Luxon type, pinning it to the particular moment in the timeline.
   * @param serialDate Date and time in Google Sheets / Excel format, as a decimal number
   * @param timezone Time zone of the date and time
   */
  public static fromSerialDate(
    serialDate: number,
    timezone = 'default'
  ): DateTime {
    try {
      // Calculating timestamp as if the source date was specified in UTC,
      // then setting the time zone as specified but keeping local time the same
      return DateTime.fromSeconds(
        (serialDate - daysBetweenEpochs) * secondsInDay
      )
        .setZone('utc')
        .setZone(timezone, { keepLocalTime: true });
    } catch (error) {
      console.error(`Value "${serialDate}" caused error`, error);
      throw error;
    }
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
    const pattern =
      // Using backreference to enforce same separators (colon or period)
      // Using lookbehinds to use a character set for the separator instead of a backreference for a case without hours
      /^(?:(?<hours>0?[0-5])(?<separator>[:.]))?(?<minutes>[0-5]?\d)((?<!^\k<minutes>)\k<separator>|(?<=^\k<minutes>)[:.])(?<seconds>[0-5]?\d)$/;
    const match = pattern.exec((timing || '').toString().trim());
    if (!match) return Duration.invalid('Incorrect format');
    const { hours = 0, minutes, seconds } = match.groups;
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

  /**
   * Converts a reduced precision date provided
   * in a pseudo ISO 8601 format `YYYYMMDD`, where unknown components (month, day) are represented as `00`,
   * into a real ISO date representation, where unknown components are omitted.
   * @param input Pseudo-ISO date string, e.g. `20050700` or `19990000`.
   * @returns ISO date string with reduced precision, e.g. `2005-07` or `1999`.
   * Returns `null` if the input date is not recognied or is not a valid date.
   */
  public static standardizePseudoIsoDate(input: string): string {
    const match = /^(\d{4})(\d{2})(\d{2})$/.exec(input);
    if (match === null) return null;

    const [, year, month, day] = match;

    // Day cannot be specified if month is not specified
    if (month === '00' && day !== '00') return null;

    const iso = [year, month, day].filter((u) => u !== '00').join('-');
    const date = DateTime.fromISO(iso, { zone: 'utc', locale: 'en' });

    // Checking if the values provided constitutes a correct date.
    if (!date.isValid) return null;

    return iso;
  }
}
