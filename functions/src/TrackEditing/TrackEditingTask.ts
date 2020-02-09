/*!
 * sri sri guru gauranga jayatah
 */

import { AllotmentStatus } from '../Allotment';
import { AudioChunk } from '../AudioChunk';
import { FileVersion } from '../FileVersion';
import { Person } from '../Person';
import _ = require('lodash');

interface FileVersionMap {
  [versionKey: string]: FileVersion;
}

export interface TrackEditingTask {
  id: string;
  isRestored: boolean;
  chunks: AudioChunk[];
  assignee?: Person;
  status: AllotmentStatus;
  timestampGiven?: number;
  timestampDone?: number;
  timestampImported?: number;
  versions: FileVersionMap;

  // public get lastVersion() {
  //   const lastVersionKey = _.findLastKey(this.versions);
  //   return lastVersionKey
  //     ? { id: lastVersionKey, ...this.versions[lastVersionKey] }
  //     : null;
  // }
}
