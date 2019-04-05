/*
 * sri sri guru gauranga jayatah
 */
import * as admin from 'firebase-admin';
import * as helpers from '../helpers';
import moment = require('moment');
import _ = require('lodash');

const validResolutions = [
  'ok',
  'drop',
  'duplicate',
  'on hold',
  'reallot',
  'repeat',
  'derivative',
];
const importedResolutions = [
  'ok',
  'reallot', //because “reallot” means that topics should be corrected, but timing is ok
];

interface Chunk {
  beginning: number;
  ending: number;
  continuationFrom: string;
  contentReporting: {
    date: string;
    locatioon: string;
    category: string;
    topics: string;
    gurudevaTimings: string;
    otherSpeakers: string;
    kirtan: string;
    abruptLecture: string;
    suggestedTitle: string;
    languages: string[];
    soundQualityRating: string;
    soundIssues: string;
    comments: string;
    submissionTimestamp: number;
    submissionSerial: number;
  };
  importTimestamp: number;
}

type ValidationErrorType =
  | 'overlapping'
  | 'changed'
  | 'misplaced'
  | 'invalid-resolution'
  | 'no-timing'
  | 'invalid-timing'
  | 'flipped-timing';

class FileValidationError {
  public errorType: ValidationErrorType;
  public chunk: Chunk;

  constructor(type: ValidationErrorType, chunk: Chunk) {
    this.errorType = type;
    this.chunk = chunk;
  }
}

class CurrentFile {
  private _name: string;
  public chunks: Chunk[] = [];
  public skip: boolean = false;

  public get name(): string {
    return this._name;
  }

  public set name(v: string) {
    if (this._name === v) return;

    this._name = v;
    this.chunks = [];
    this.skip = false;
  }

  sortChunks() {
    this.chunks = _.sortBy(this.chunks, ['beginning', 'ending']);
  }
}

/**
 * Class that imports all chunks from a particular sheet
 */
export class ChunksImport {
  private list: string;
  private currentFile: CurrentFile = new CurrentFile();

  public validationErrors = new Map<string, FileValidationError[]>();
  public importedChunks: number = 0;

  constructor(list: string) {
    this.list = list;
  }

  private get currentFileIsValid(): boolean {
    return this.validationErrors.has(this.currentFile.name);
  }

  /**
   * Imports a particular sheet from the processing spreadsheet
   * @param sheet Sheet instance
   */
  public async import(rows: any[]) {
    for (const row of rows) {
      /// Flushing chunks if the file name changed
      if (this.currentFile.name !== row['Audio File Name'])
        await this.flushCurrentChunks();

      this.currentFile.name = row['Audio File Name'];

      if (!row['Resolution'] || !row['Fidelity Check Resolution']) {
        this.currentFile.skip = true;
        continue;
      }

      this.validateRow(row);
      if (!this.currentFileIsValid) {
        console.debug(`${this.currentFile.name}: not valid`);
        continue;
      }

      console.debug('Pushing a chunk');

      this.currentFile.chunks.push({
        beginning: moment.duration(row['Beginning']).asSeconds(),
        ending: moment.duration(row['Ending']).asSeconds(),
        continuationFrom: row['Continuation From'],
        contentReporting: {
          date: row['Date'],
          locatioon: row['Location'],
          category: row['Category'],
          topics: row['Topics'],
          gurudevaTimings: row['Gurudeva Timings'],
          otherSpeakers: row['Other Speakers'],
          kirtan: row['Kirtan'],
          abruptLecture: row['Abrupt Lecture'],
          suggestedTitle: row['Suggested Title'],
          languages: row['Languages'].split(',').map(l => l.trim()),
          soundQualityRating: row['Sound Quality'],
          soundIssues: row['Sound Issues'],
          comments: row['Comments'],
          submissionTimestamp: row['Timestamp'],
          submissionSerial: row['Submission Serial'],
        },
        importTimestamp: admin.database.ServerValue.TIMESTAMP,
      });
    }

    /// Flushing the last file
    await this.flushCurrentChunks();
  }

  private validateRow(row: any) {
    /// File name belongs to the list identified by the sheet name
    if (helpers.extractListFromFilename(row['Audio File Name']) !== this.list)
      this.pushValidationError('misplaced', row);

    /// Both validResolutions belong to the list of known validResolutions.
    if (
      !validResolutions.includes(row['Resolution'].toLowerCase()) ||
      !validResolutions.includes(row['Fidelity Check Resolution'].toLowerCase())
    )
      this.pushValidationError('invalid-resolution', row);

    /// Further checks only for those rows which are to be imported
    if (
      !importedResolutions.includes(
        row['Fidelity Check Resolution'].toLowerCase()
      )
    )
      return;

    /// Beginning and Ending should be filled for rows which are to be imported
    if (!row['Beginning'] || !row['Ending'])
      this.pushValidationError('no-timing', row);

    const beginning = moment.duration(row['Beginning']).asSeconds();
    const ending = moment.duration(row['Ending']).asSeconds();

    /// Beginning and Ending should be valid
    if (beginning === NaN || ending === NaN)
      this.pushValidationError('invalid-timing', row);

    /// Beginning should be less than Ending
    if (beginning >= ending) this.pushValidationError('flipped-timing', row);
  }

  private pushValidationError(errorType: ValidationErrorType, row: any = null) {
    const error = new FileValidationError(errorType, row);
    if (!this.validationErrors.has(this.currentFile.name))
      this.validationErrors.set(this.currentFile.name, [error]);
    else this.validationErrors.get(this.currentFile.name).push(error);
    console.log(`${this.currentFile.name}: ${errorType}`);
  }

  /**
   * Validates all the current chunks as a whole and saves to the database if valid
   */
  private async flushCurrentChunks(): Promise<boolean> {
    if (!this.currentFile.name || this.currentFile.chunks.length <= 0)
      return false;

    console.debug(
      `${this.currentFile.name}: flushing chunks ${this.currentFile.chunks}`
    );
    this.currentFile.sortChunks();

    const ref = admin
      .database()
      .ref(`/chunks/${this.list}/${this.currentFile.name}`);
    const snapshot = await ref.once('value');

    /// Chunks should not have been changed after previous import
    if (snapshot.exists())
      if (!_.isEqual(this.currentFile.chunks, snapshot.val()))
        this.pushValidationError('changed');
      else return false;

    /// Chunks should not overlap each other
    if (
      this.currentFile.chunks.reduce(
        (overlaps, chunk, index) =>
          overlaps ||
          (index > 0 &&
            chunk.beginning < this.currentFile.chunks[index - 1].ending),
        false
      )
    )
      this.pushValidationError('overlapping');

    if (this.currentFileIsValid) {
      console.warn(
        `${this.currentFile.name}: ${this.validationErrors.get(
          this.currentFile.name
        )}`
      );
      return false;
    }

    if (!this.currentFile.skip) {
      await ref.set(this.currentFile.chunks);
      this.importedChunks += this.currentFile.chunks.length;
      console.info(`${this.currentFile.name}: imported`);
    }

    return true;
  }
}
