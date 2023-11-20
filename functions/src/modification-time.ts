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
  /**
   * All metadata items are strings.
   * Casting type until `@google-cloud/storage` v7, where better typing of metadata is introduced
   * https://github.com/googleapis/nodejs-storage/pull/2234
   */
  const mtime = file.metadata.metadata?.['goog-reserved-file-mtime'] as string;
  // Only 10-digit numbers are considered valid (seva started in 2017)
  return /^[0-9]{10}$/.test(mtime)
    ? // This metadata contains time in Unix epoch seconds
      DateTime.fromSeconds(+mtime)
    : // RFC 3339 (in fact ISO), e.g. 2020-08-24T09:28:12.483Z - see https://cloud.google.com/storage/docs/json_api/v1/objects#resource
      DateTime.fromISO(file.metadata?.timeCreated as string);
};
