/**
 * @param {number} duration in seconds
 */
export const formatDurationForHumans = (duration) =>
  // https://stackoverflow.com/questions/6312993/javascript-seconds-to-time-string-with-format-hhmmss#comment65343664_25279399
  new Date(1000 * duration).toISOString().substring(11, 19);
