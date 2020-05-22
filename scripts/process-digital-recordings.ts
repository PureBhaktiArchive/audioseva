/*!
 * sri sri guru gauranga jayatah
 */

import { getAudioDurationInSeconds } from 'get-audio-duration';
import * as glob from 'glob';
import { DigitalRecordingRow } from '../functions/src/DigitalRecordingRow';
import { Spreadsheet } from '../functions/src/Spreadsheet';
import fs = require('fs');
import path = require('path');
import _ = require('lodash');

/**
 * Renames the local files according to the DIGI codes from the Consolidated sheet.
 * @param spreadsheetId Id of the Digital Recordings spreadsheet
 */
const processDigitalRecordings = async (rootDirectory, spreadsheetId) => {
  const files = _.groupBy(
    glob.sync('Source/**/*.*', { cwd: rootDirectory, absolute: true }),
    (fileName) =>
      path
        .basename(fileName, path.extname(fileName))
        .replace(/\.(mp3|wav)$/, '')
  );

  const spreadsheet = await Spreadsheet.open<DigitalRecordingRow>(
    spreadsheetId,
    'Consolidated'
  );

  const rows = await spreadsheet.getRows();
  console.log(`Fetched ${rows.length} rows`);

  type Resolution = 'DERIVATIVE' | 'MISSING' | 'FOUND';

  const resolutionMapping = new Map<string, Resolution>();

  const uniqueRows = _(rows)
    .filter('DIGI Code')
    .sortBy('DIGI Code')
    .uniqBy('DIGI Code')
    .take(10)
    .value();

  for (const row of uniqueRows) {
    const code = row['DIGI Code'];
    const fileName = row['File Name'];
    // const directory = rows[0]['Directory'];

    const [list] = code.split('-');
    const target = path.join(rootDirectory, 'Renamed', list, `${code}.mp3`);
    fs.mkdirSync(path.dirname(target), { recursive: true });

    // Skipping derivatives
    const originalName = fileName.replace(/(_FINAL|\s+restored)$/, '');
    if (fileName !== originalName) continue; //return 'DERIVATIVE';

    const found = files[fileName];
    if (found.length === 0) continue; //return 'MISSING';
    if (found.length === 1) continue;

    for (const fileName of found) {
      const duration = await getAudioDurationInSeconds(fileName);
      console.log(duration, code, fileName);
    }

    // return 'FOUND';
  }

  //     # Checking that there are at most two formats for the same file name
  //     $byExtension = $found | Group-Object Extension -AsHashTable -AsString;
  //     if ($byExtension.Count -gt 2) {
  //         "$code`tTOO MANY FORMATS`t$fileName`t$($byExtension.Keys.Count)" `
  //         | Tee-Object "Logs/$timestamp/OnHold.txt" -Append `
  //         | Write-Warning
  //         return
  //     }

  //     # Checking that only one unique copy is there in each file format
  //     foreach ($extension in $byExtension.Keys) {
  //         $filesOfExtension = $byExtension[$extension];
  //         $sizes = $filesOfExtension | Select-Object -Property Length -Unique;
  //         if ($sizes.Count -gt 1) {
  //             "$code`tTOO MANY SIZES`t$($filesOfExtension[0].Name)" `
  //             | Tee-Object "Logs/$timestamp/OnHold.txt" -Append `
  //             | Write-Warning
  //             return
  //         }
  //     }

  //     return

  //     if (Test-Path $target) {
  //         Write-Verbose "$code target file already exists."
  //         # TODO: check which file was renamed earlier
  //         return
  //     }

  //     # Converting a file into MP3 if MP3 is not found
  //     if (".mp3" -notin $byExtension.Keys) {
  //         $otherFile = $found[0];
  //         $mp3File = [io.path]::ChangeExtension($otherFile.FullName, ".mp3");
  //         Write-Host "$code`tConverting '$otherFile' into MP3."
  //         &"\Scripts\ffmpeg.exe" -hide_banner -loglevel error -i "$($otherFile.FullName)" -codec:a libmp3lame -b:a 64k $mp3File
  //     }
  //     else {
  //         $mp3File = $byExtension[".mp3"][0].FullName
  //     }

  //     Copy-Item $mp3File $target;
  //     Write-Host "$code copied from '$mp3File'.";
  //     $code | Out-File "Logs/$timestamp/New.txt" -Append;
  // }
  return;

  const resolutions = rows.map(
    (row) => resolutionMapping.get(row['DIGI Code']) || null
  );
  await spreadsheet.updateColumn('Upload Status', resolutions);
};

// First two arguments are node and the script name
const [rootDirectory, spreadsheetId] = process.argv.slice(2);

processDigitalRecordings(rootDirectory, spreadsheetId);
