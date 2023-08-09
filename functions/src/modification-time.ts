/*!
 * sri sri guru gauranga jayatah
 */

import { File } from '@google-cloud/storage';
import { DateTime } from 'luxon';

/**
 * The `goog-reserved-file-mtime` custom metadata overrides timeCreated
 * because files might have been moved or re-uploaded after creation.
 * @param file Input file, metadata should be fetched
 * @returns File's modification time in epoch seconds
 */
export const modificationTime = (file: File): DateTime => {
  const mtime = file.metadata?.metadata?.['goog-reserved-file-mtime'];
  return Number.isFinite(mtime)
    ? // This metadata contains time in Unix epoch seconds
      DateTime.fromSeconds(mtime)
    : // ISO format, e.g. 2020-08-24T09:28:12.483Z
      DateTime.fromISO(file.metadata.timeCreated);
};
