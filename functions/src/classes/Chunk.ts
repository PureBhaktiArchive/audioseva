/*
 * sri sri guru gauranga jayatah
 */

import { extractListFromFilename } from '../helpers';
import { DateTimeConverter } from './DateTimeConverter';
import _ = require('lodash');

export enum Resolution {
  Ok = 'OK',
  Drop = 'DROP',
  Duplicate = 'DUPLICATE',
  OnHold = 'ON HOLD',
  Reallot = 'REALLOT',
  Repeat = 'REPEAT',
  Derivative = 'DERIVATIVE',
}

export class Chunk {
  fileName: string;
  beginning: number;
  ending: number;
  continuationFrom?: string;
  date?: string;
  location?: string;
  category?: string;
  topics?: string;
  suggestedTitle?: string;
  languages?: string[];
  resolution?: Resolution;

  public constructor(init?: Partial<Chunk>) {
    if (init) Object.assign(this, init);
  }

  public get list(): string {
    return extractListFromFilename(this.fileName);
  }

  public static createFromRow(row: any): Chunk {
    const chunk = new Chunk();
    chunk.fileName = row['Audio File Name'];

    chunk.beginning = DateTimeConverter.parseDuration(row['Beginning']).as(
      'seconds'
    );
    chunk.ending = DateTimeConverter.parseDuration(row['Ending']).as('seconds');
    chunk.continuationFrom = row['Continuation From'];
    chunk.date = row['Date'];
    chunk.location = row['Location'];
    chunk.category = row['Category'];
    chunk.topics = row['Topics'];
    chunk.suggestedTitle = row['Suggested Title'];
    chunk.languages = _(row['Languages'])
      .split(',')
      .map(_.trim)
      .compact()
      .value();
    chunk.resolution = row['Fidelity Check Resolution']
      ? row['Fidelity Check Resolution'].toUpperCase()
      : null;

    return chunk;
  }

  public get isValid(): Boolean {
    return !this.warnings;
  }

  public get warnings(): string[] {
    const result = [];

    /// Resolution should be correct
    if (!Object.values(Resolution).includes(this.resolution))
      result.push(`Invalid resolution '${this.resolution}'`);

    if (this.beginning == null) result.push('Beginning is incorrect');

    if (this.ending == null) result.push('Ending is incorrect');

    if (
      this.beginning != null &&
      this.ending != null &&
      this.beginning === this.ending
    )
      result.push('Beginning is equal to Ending');

    if (this.beginning > this.ending) result.push('Timing is flipped');

    return result;
  }
}
