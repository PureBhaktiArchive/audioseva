import * as ffmpeg from 'fluent-ffmpeg';
import { Duration } from 'luxon';
import { Readable, Writable } from 'stream';

/** @type {ffmpeg.PresetFunction} */
export const convertToMp3 = (command) =>
  void command
    .withAudioCodec('libmp3lame')
    .withAudioBitrate(64)
    .withAudioFrequency(22050)
    // Using the best reasonable quality https://github.com/gypified/libmp3lame/blob/f416c19b3140a8610507ebb60ac7cd06e94472b8/USAGE#L491
    .withOutputOption('-compression_level 2')
    .withOutputFormat('mp3');

/** @type {ffmpeg.PresetFunction} */
export const copyCodec = (command) => void command.withAudioCodec('copy');

/**
 * @param {Record<string, string>} metadata
 * @returns {ffmpeg.PresetFunction}
 */
export const addMediaMetadata = (metadata) => (command) =>
  void command
    .withOutputOptions([
      // Required because Windows only supports version up to 3 of ID3v2 tags
      '-id3v2_version 3',
      // the ID3v1 version to create legacy v1.1 tags
      '-write_id3v1 1',
      // Clearing all existing metadata, see https://gist.github.com/eyecatchup/0757b3d8b989fe433979db2ea7d95a01#3-cleardelete-id3-metadata
      '-map_metadata -1',
    ])
    .withOutputOptions(
      Object.entries(metadata).flatMap(([name, value]) => [
        '-metadata',
        `${name}=${value || ''}`,
      ])
    );

/**
 * @param {ffmpeg.PresetFunction[]} presets
 * @returns {ffmpeg.PresetFunction}
 */
const combinePresets = (presets) => (command) =>
  presets.reduce((command, preset) => command.usingPreset(preset), command);

/**
 * Promisifies the Ffmpeg command.
 * Taken from https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/710#issuecomment-382917544
 *
 * @param {ffmpeg.FfmpegCommand} command
 * @returns {Promise<string>} Output of the command
 */
const runCommandAsync = (command) =>
  new Promise((resolve, reject) =>
    command
      .on('start', (commandLine) =>
        console.debug('Spawned ffmpeg with command', commandLine)
      )
      .on('error', reject)
      .on('end', (stdout, stderr) =>
        /**
         * According to the[documentation](https://fluent-ffmpeg.github.io/index.html#setting-event-handlers),
         * “stdout is empty when the command outputs to a stream”. Therefore using `stderr` if `stdout` is empty.
         */
        resolve(stdout || stderr)
      )
      .run()
  );

/**
 * Transcodes the input audio using the specified preset and metadata.
 *
 * @param {Readable} inputStream
 * @param {Writable} outputStream
 * @param {ffmpeg.PresetFunction[]} presets
 * @returns {Promise<number>} A duration of the transcoded audio
 */
export const transcode = (inputStream, outputStream, ...presets) =>
  runCommandAsync(
    ffmpeg()
      .withOption('-hide_banner')
      .withOption('-nostats')
      .input(inputStream)
      .output(outputStream, { end: true })
      .usingPreset(combinePresets(presets))
  )
    /**
     * Sometimes `ffprobe` cannot extract duration from a stream and returns `N/A`.
     * Therefore it is [officially suggested](https://trac.ffmpeg.org/wiki/FFprobeTips#Getdurationbydecoding)
     * to get real duration by decoding.
     *
     * Extracting the duration from the command output.
     */
    .then((output) => {
      const match = /time=(\d+):(\d\d):(\d\d)(.\d+)\b/.exec(output);
      return match
        ? Duration.fromObject({
            hours: Number(match[1]),
            minutes: Number(match[2]),
            seconds: Number(match[3]),
            milliseconds: Number(match[4]) * 1000,
          }).as('seconds')
        : NaN;
    });
