/*!
 * sri sri guru gauranga jayatah
 */

import { StorageManager } from './StorageManager';

jest.mock('firebase-functions', () => ({
  config: () => ({ project: { domain: 'test' } }),
}));

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  storage: () => ({
    bucket: jest.fn(name => ({ name })),
  }),
}));

describe('List extraction', () => {
  test.each`
    fileName                   | list
    ${'HI445A'}                | ${'ML1'}
    ${'ML2-1A (2)'}            | ${'ML2'}
    ${'SER-88A'}               | ${'SER'}
    ${'19960528LEICESTER_T36'} | ${null}
  `('extracts $list from $fileName', ({ fileName, list }) => {
    expect(StorageManager.extractListFromFilename(fileName)).toEqual(list);
  });
});

describe('File name standardization', () => {
  test.each`
    input         | standard
    ${'Hi3 A'}    | ${'ML1-003A'}
    ${'BR-01A'}   | ${'BR-001A'}
    ${'DK-1A'}    | ${'DK-001A'}
    ${'SER-88A'}  | ${'SER-088A'}
    ${'ML2-71 A'} | ${'71 A'}
  `('$input → $standard', ({ input, standard }) => {
    expect(StorageManager.standardizeFileName(`${input}.mp3`)).toEqual(
      `${standard}.mp3`
    );
  });
});

describe('File', () => {
  beforeAll(() => {});

  test.each`
    baseName   | bucket             | path
    ${'DK-1A'} | ${'original.test'} | ${'DK/DK-001A'}
  `(
    `$baseName is found in the '$bucket' bucket`,
    ({ baseName, bucket, path }) => {
      const fileName = `${baseName}.flac`;
      const file = StorageManager.findFile(fileName);
      expect(file.bucket.name).toEqual(bucket);
      expect(file.name).toEqual(path);
    }
  );
});
