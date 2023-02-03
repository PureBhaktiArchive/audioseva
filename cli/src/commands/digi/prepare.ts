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
import { cwd } from 'process';
import util from 'util';
import { Argv } from 'yargs';
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
  });
  const filesByBaseName = _.groupBy(files, (fileName) =>
    path
      .basename(fileName, path.extname(fileName))
      // Sometimes there are additional extensions, they are removed in the spreadsheet, so removing here also
      .replace(/\.(mp3|wav)$/, '')
  );
  spinner.succeed(`Found ${files.length} files`);

  const conversionQueue = async.queue<ConversionTask>((task, callback) => {
    ffprobe(task.source)
      .then(({ format }) =>
        ffmpeg(task.source)
          .withAudioCodec('libmp3lame')
          .withAudioBitrate(Math.max(format.bit_rate / 1000, 64))
          .output(task.destination)
          .on('start', console.log)
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

  const durationsCacheFile = path.join(cwd(), 'durations.txt');
  // Relative file path to Duration
  const durationsCache = new Map<string, number>(
    fs.existsSync(durationsCacheFile)
      ? JSON.parse(fs.readFileSync(durationsCacheFile, 'utf8'))
      : []
  );
  async function getDuration(filePath: string) {
    const relativePath = path.relative(sourcePath, filePath);
    if (!durationsCache.has(relativePath))
      durationsCache.set(
        relativePath,
        await getAudioDurationInSeconds(filePath).catch(() => undefined)
      );
    return durationsCache.get(relativePath);
  }

  async function findAndConvertFile(
    code: string,
    fileName: string
  ): Promise<Resolution> {
    const [list] = code.split('-');

    // Skipping derivatives
    const originalName = fileName.replace(/(_FINAL|\s+restored)$/, '');
    if (fileName !== originalName) return 'DERIVATIVE';

    const found = filesByBaseName[fileName];
    if (!found?.length) return 'MISSING';

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const durations = await async.map<string, number>(found, getDuration);

    // Checking that all the durations are within interval of 1 second
    if (Math.abs(Math.min(...durations) - Math.max(...durations)) > 1)
      return 'CONTROVERSIAL';

    const targetFolderPath = path.join(destinationPath, list);
    fs.mkdirSync(targetFolderPath, { recursive: true });
    const targetFilePath = path.join(targetFolderPath, `${code}.mp3`);

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

    if (!fs.existsSync(targetFilePath))
      void conversionQueue.push({
        source: bestSuitableFile,
        destination: targetFilePath,
      });

    return 'FOUND';
  }

  // Code → Resolution
  const resolutions = new Map<string, Resolution>();

  spinner.info('Processing files to launch');
  for (const [code, fileName] of _(rows)
    .filter('DIGI Code') // Only those with DIGI Code
    .filter('Launch') // Only thouse marked to be launched
    .filter(['Launched', null])
    .groupBy('DIGI Code')
    .mapValues((rows) => rows[0]['File Name'])
    .toPairs()
    .value()) {
    resolutions.set(code, await findAndConvertFile(code, fileName));
  }

  spinner.start('Saving durations.txt');
  fs.writeFileSync(durationsCacheFile, JSON.stringify([...durationsCache]));
  spinner.succeed();

  spinner.info('Starting conversion');
  conversionQueue.resume();
  await conversionQueue.drain();

  spinner.start('Saving statuses into the spreadsheet');
  await spreadsheet.updateColumn(
    'File Status',
    rows.map((row) => resolutions.get(row['DIGI Code']) || null)
  );
  spinner.succeed();
};
