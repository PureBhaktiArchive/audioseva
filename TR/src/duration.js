import { Duration } from 'luxon';

/**
 * @param {number} seconds in seconds
 */
export const formatDurationForHumans = (seconds) =>
  Duration.fromObject({ seconds }).toFormat('mm:ss');
