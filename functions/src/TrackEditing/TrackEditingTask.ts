/*!
 * sri sri guru gauranga jayatah
 */

import { Allotment } from '../Allotment';
import { AudioChunk } from '../AudioChunk';
import { FileVersion } from '../FileVersion';
import _ = require('lodash');

interface FileVersionMap {
  [versionKey: string]: FileVersion;
}

export class TrackEditingTask extends Allotment {
  id: string;
  isRestored: boolean;
  chunks: AudioChunk[];
  versions: FileVersionMap;
  timestampImported?: number;

  constructor(id: string, source: Partial<TrackEditingTask>) {
    super(source);
    Object.assign(this, source);
    this.id = id;
  }

  public get lastVersion(): FileVersion {
    const lastVersionKey = _.findLastKey(this.versions);
    return this.versions[lastVersionKey];
  }

  public toString(): string {
    return this.id;
  }
}
