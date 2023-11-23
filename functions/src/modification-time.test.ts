/*
 * sri sri guru gauranga jayatah
 */

import { File } from './StorageManager';
import { modificationTime } from './modification-time';

describe('File modification time', () => {
  const sampleTimeCreated = '2020-08-23T14:02:54.724Z';
  const sampleTimeCreatedTimestamp = 1598191374724;

  // Testing mtime that is before and after timeCreated
  test.each`
    mtime              | result
    ${'1598189082'}    | ${1598189082000}
    ${'1598289082'}    | ${1598289082000}
    ${'1598189082000'} | ${sampleTimeCreatedTimestamp}
    ${'something'}     | ${sampleTimeCreatedTimestamp}
    ${'123'}           | ${sampleTimeCreatedTimestamp}
    ${''}              | ${sampleTimeCreatedTimestamp}
    ${null}            | ${sampleTimeCreatedTimestamp}
    ${undefined}       | ${sampleTimeCreatedTimestamp}
  `('with mtime $mtime', ({ mtime, result }) => {
    const file = {
      metadata: {
        timeCreated: sampleTimeCreated,
        metadata: undefined,
      },
    };
    if (mtime !== undefined)
      file.metadata.metadata = { ['goog-reserved-file-mtime']: mtime };

    expect(modificationTime(file as File).toMillis()).toEqual(result);
  });
});
