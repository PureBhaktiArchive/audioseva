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
    bucket: jest.fn(name => ({ name, file: fileName => ({ name: fileName }) })),
  }),
}));

describe('File', () => {
  test.each`
    bucket        | fileName           | path
    ${'original'} | ${'Hi3 A.flac'}    | ${'ML1/ML1-003A.flac'}
    ${'original'} | ${'BR-01A.flac'}   | ${'BR/BR-001A.flac'}
    ${'original'} | ${'DK-1A.flac'}    | ${'DK/DK-001A.flac'}
    ${'original'} | ${'SER-88A.flac'}  | ${'SER/SER-088A.flac'}
    ${'original'} | ${'ML2-71 A.flac'} | ${'ML2/71 A.flac'}
    ${'restored'} | ${'Hi3 A.flac'}    | ${'ML1/Hi3 A.flac'}
    ${'restored'} | ${'BR-01A.flac'}   | ${'BR/BR-01A.flac'}
    ${'restored'} | ${'DK-1A.flac'}    | ${'DK/DK-1A.flac'}
    ${'restored'} | ${'SER-88A.flac'}  | ${'SER/SER-88A.flac'}
    ${'restored'} | ${'ML2-71 A.flac'} | ${'ML2/ML2-71 A.flac'}
  `(
    `$bucket $fileName is served from gs://$bucket/$path`,
    ({ fileName, bucket, path }) => {
      const file = StorageManager.getFile(bucket, fileName);
      expect(file.name).toEqual(path);
    }
  );
});