/*!
 * sri sri guru gauranga jayatah
 */

import * as async from 'async';
import ffmpeg, { FfprobeData } from 'fluent-ffmpeg';
import fs from 'fs';
import getAudioDurationInSeconds from 'get-audio-duration';
import glob from 'glob';
import _ from 'lodash';
import ora from 'ora';
import os from 'os';
import path from 'path';
import util from 'util';
import { Argv } from 'yargs';
import { groupBy } from '../../array';
import { DigitalRecordingRow } from '../../DigitalRecordingRow';
import { Spreadsheet } from '../../Spreadsheet';

const ffprobe = util.promisify<string, FfprobeData>(ffmpeg.ffprobe);

export const desc =
  'Convert and rename local files according to the codes in the spreadsheet';

export const builder = (yargs: Argv<Arguments>): Argv<Arguments> =>
  yargs.options({
    sourcePath: {
      type: 'string',
      alias: 'p',
      describe: 'path of the source audio files folder',
      demandOption: true,
    },
    destinationPath: {
      type: 'string',
      alias: 'd',
      describe: 'path of the renamed audio files folder',
      demandOption: true,
    },
    spreadsheetId: {
      type: 'string',
      alias: 's',
      describe: 'Digital Recordings spreadsheet id',
      demandOption: true,
    },
  });

type Resolution = 'DERIVATIVE' | 'MISSING' | 'FOUND' | 'CONTROVERSIAL';
interface ConversionTask {
  source: string;
  destination: string;
}

interface Arguments {
  sourcePath: string;
  destinationPath: string;
  spreadsheetId: string;
}

export const handler = async ({
  sourcePath,
  destinationPath,
  spreadsheetId,
}: Arguments): Promise<void> => {
  const spinner = ora();

  spinner.start('Fetching rows');
  const spreadsheet = await Spreadsheet.open<DigitalRecordingRow>(
    spreadsheetId,
    'Consolidated'
  );
  const rows = await spreadsheet.getRows();
  spinner.succeed(`Fetched ${rows.length} rows`);

  spinner.start('Scanning directory');
  const files = await util.promisify(glob)('**/*.*', {
    cwd: sourcePath,
    absolute: true,
    ignore: '**/_vti_cnf/**',
  });
  const filesByBaseName = groupBy(files, (fileName) =>
    path
      .basename(fileName, path.extname(fileName))
      // Sometimes there are additional extensions, they are removed in the spreadsheet, so removing here also
      .replace(/\.(mp3|wav)$/, '')
  );
  spinner.succeed(
    `Found ${files.length} files, ${filesByBaseName.size} unique base names`
  );

  const conversionQueue = async.queue<ConversionTask>((task, callback) => {
    ffprobe(task.source)
      .then(({ format }) =>
        ffmpeg(task.source)
          .withAudioCodec('libmp3lame')
          .withAudioBitrate(Math.max(format.bit_rate / 1000, 64))
          .output(task.destination)
          .on('error', callback)
          .on('end', () => callback(null))
          .run()
      )
      .catch(callback);
  }, os.cpus().length);
  conversionQueue.error((e, task) => {
    console.error(`Error converting ${task.source}`, e);
  });
  conversionQueue.pause();

  /**
   *
   * @param code DIGI code
   * @param fileName Base file name
   * @returns Tuple, where the first element is the status of the file and the second one is the found file path
   */
  async function findBestFile(fileName: string): Promise<[Resolution, string]> {
    // Skipping derivatives
    if (/(_FINAL|\s+restored)$/.test(fileName)) return ['DERIVATIVE', null];

    if (!filesByBaseName.has(fileName)) return ['MISSING', null];
    const found = filesByBaseName.get(fileName);

    const durations = await Promise.all(found.map(getAudioDurationInSeconds));

    // Checking that all the durations are within interval of 1 second
    if (Math.abs(Math.min(...durations) - Math.max(...durations)) > 1)
      return ['CONTROVERSIAL', null];

    // Finding the most appropriate file among all with the same name
    const bestSuitableFile = _(found)
      .sortBy(
        /**
         * Some folders are more likely to contain the original files,
         * whereas some are likely to contain derivatives like cleaned ones.
         * */
        (fileName) =>
          fileName.includes('from Brajanath Prabhu')
            ? -1
            : fileName.includes('Srila BV Narayan Maharaja  mp3')
            ? 99
            : /clean|restored/.test(fileName)
            ? 100
            : 0,
        /**
         * WMA are more likely to be the originals
         */
        (fileName) => (path.extname(fileName).toLowerCase() === '.wma' ? -1 : 0)
      )
      .first();

    return ['FOUND', bestSuitableFile];
  }

  // Code → Resolution
  const resolutions = new Map<string, Resolution>();

  spinner.info('Processing files to launch');
  const rowsToLaunch = _(rows)
    .filter('DIGI Code') // Only those with DIGI Code
    .filter('Launch') // Only those marked to be launched
    .filter(['Launched', null])
    .value();
  for (const {
    'DIGI Code': code,
    'File Name': fileName,
    Extension: extension,
  } of rowsToLaunch) {
    const targetFolderPath = path.join(destinationPath, code.split('-')[0]);
    fs.mkdirSync(targetFolderPath, { recursive: true });
    const targetFilePath = path.join(targetFolderPath, `${code}.mp3`);

    if (fs.existsSync(targetFilePath)) {
      console.info(`${code} already exists`);
      continue;
    }

    const [status, filePath] = await findBestFile(fileName);
    resolutions.set(code, status);
    if (filePath) {
      console.info(
        `${code} - ${path.relative(sourcePath, filePath)} ${
          path.extname(filePath).toUpperCase() !== extension.toUpperCase()
            ? '\x1b[31mdifferent extension\x1b[0m'
            : ''
        }`
      );

      void conversionQueue.push({
        source: filePath,
        destination: targetFilePath,
      });
    } else console.info(`${code} - \x1b[43m${status}\x1b[0m`);
  }

  spinner.info('Starting conversion');
  conversionQueue.resume();
  await conversionQueue.drain();

  spinner.start('Saving statuses into the spreadsheet');
  await spreadsheet.updateColumn(
    'File Status',
    rows.map((row) => resolutions.get(row['DIGI Code']) || null)
  );
  spinner.succeed('Saved statuses into the spreadsheet');
};
