/*
 * sri sri guru gauranga jayatah
 */

import { File } from '@google-cloud/storage';
import { modificationTime } from './modification-time';

describe('File modification time', () => {
  const sampleTimeCreated = '2020-08-23T14:02:54.724Z';
  const sampleTimeCreatedTimestamp = 1598191374724;

  test('should be taken from timeCreated if no mtime', () => {
    const file = {
      metadata: {
        timeCreated: sampleTimeCreated,
      },
    };
    expect(modificationTime(file as File).toMillis()).toEqual(
      sampleTimeCreatedTimestamp
    );
  });

  // Testing mtime that is before and after timeCreated
  test.each`
    timeCreated                   | mtime
    ${'2020-08-23T14:02:54.724Z'} | ${1598189082}
    ${'2020-08-23T14:02:54.724Z'} | ${1598289082}
  `('should be taken from mtime $mtime', ({ timeCreted, mtime }) => {
    const file = {
      metadata: {
        timeCreted,
        metadata: { ['goog-reserved-file-mtime']: mtime },
      },
    };
    expect(modificationTime(file as File).toSeconds()).toEqual(mtime);
  });
});
