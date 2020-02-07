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
    bucket        | fileName               | path
    ${'original'} | ${'Hi3 A.flac'}        | ${'ML1/ML1-003A.flac'}
    ${'original'} | ${'BR-01A.flac'}       | ${'BR/BR-001A.flac'}
    ${'original'} | ${'DK-1A.flac'}        | ${'DK/DK-001A.flac'}
    ${'original'} | ${'SER-88A.flac'}      | ${'SER/SER-088A.flac'}
    ${'original'} | ${'ML2-71 A.flac'}     | ${'ML2/71 A.flac'}
    ${'restored'} | ${'Hi3 A.flac'}        | ${'ML1/Hi3 A.flac'}
    ${'restored'} | ${'BR-01A.flac'}       | ${'BR/BR-01A.flac'}
    ${'restored'} | ${'DK-1A.flac'}        | ${'DK/DK-1A.flac'}
    ${'restored'} | ${'SER-88A.flac'}      | ${'SER/SER-88A.flac'}
    ${'restored'} | ${'ML2-71 A.flac'}     | ${'ML2/ML2-71 A.flac'}
    ${'edited'}   | ${'DK-001-1.flac'}     | ${'DK/DK-001-1.flac'}
    ${'edited'}   | ${'DIGI07-0001-1.mp3'} | ${'DIGI07/DIGI07-0001-1.mp3'}
  `(
    `$bucket $fileName is served from gs://$bucket/$path`,
    ({ fileName, bucket, path }) => {
      const file = StorageManager.getFile(bucket, fileName);
      expect(file.name).toEqual(path);
    }
  );
});

describe('Uploaded SE file', () => {
  test.each`
    sourceFileName               | destinationFileName
    ${'folder/ISK-22-2_v2.flac'} | ${'ISK/ISK-22-2.flac'}
    ${'a/b/c/ML2-1059-1.flac'}   | ${'ML2/ML2-1059-1.flac'}
    ${'ML2-1113-1_v2-2.flac'}    | ${'ML2/ML2-1113-1.flac'}
    ${'ML2-97 B_V2.flac'}        | ${'ML2/ML2-97 B.flac'}
    ${'BR-03B v3.flac'}          | ${'BR/BR-03B.flac'}
    ${'DIGI07-0001-1.mp3'}       | ${'DIGI07/DIGI07-0001-1.mp3'}
  `(
    `$sourceFileName should be saved to $destinationFileName`,
    ({ sourceFileName, destinationFileName }) => {
      const file = StorageManager.getDestinationFileForRestoredUpload(
        sourceFileName
      );
      expect(file).not.toBeNull();
      expect(file.name).toEqual(destinationFileName);
    }
  );
});
