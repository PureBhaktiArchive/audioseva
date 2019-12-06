/*!
 * sri sri guru gauranga jayatah
 */

import { StorageManager } from './StorageManager';
const testEnv = require('firebase-functions-test')();

testEnv.mockConfig({ project: { domain: 'test' } });

/**
 * mock setup
 */
const mockSet = jest.fn();

mockSet.mockReturnValue(true);

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  storage: () => ({
    bucket: jest.fn(name => ({})),
  }),
  database: () => ({
    ref: jest.fn(path => ({
      set: mockSet,
    })),
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
  test.each`
    fileName   | path
    ${'DK-1A'} | ${'DK/DK-001A'}
  `(`$fileName is found`, ({ fileName, path }) => {
    const file = StorageManager.findFile(fileName);
    expect(file.name).toEqual(path);
  });
});
