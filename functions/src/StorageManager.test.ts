/*!
 * sri sri guru gauranga jayatah
 */

import { MockStorage } from './MockStorage';
import { StorageManager } from './StorageManager';

/* eslint-disable @typescript-eslint/no-unsafe-argument */

jest.mock('firebase-functions', () => ({
  config: () => ({ project: { domain: 'test' } }),
}));

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  storage: jest.fn(() => new MockStorage()),
}));

describe('Candidates', () => {
  test.each`
    bucket        | fileName                | candidates
    ${'original'} | ${'Hi3 A.flac'}         | ${['original.test/ML1/ML1-003A.flac']}
    ${'original'} | ${'Hi201.mp3'}          | ${['original.test/ML1/ML1-201A.mp3']}
    ${'original'} | ${'Hi201B.mp3'}         | ${['original.test/ML1/ML1-201B.mp3']}
    ${'original'} | ${'BR-01A.flac'}        | ${['original.test/BR/BR-001A.flac']}
    ${'original'} | ${'DK-1A.flac'}         | ${['original.test/DK/DK-001A.flac']}
    ${'original'} | ${'SER-88A.flac'}       | ${['original.test/SER/SER-088A.flac']}
    ${'original'} | ${'ML2-71 A.flac'}      | ${['original.test/ML2/71 A.flac']}
    ${'restored'} | ${'Hi3 A.flac'}         | ${['restored.test/ML1/Hi3 A.flac']}
    ${'restored'} | ${'BR-01A.flac'}        | ${['restored.test/BR/BR-01A.flac']}
    ${'restored'} | ${'DK-1A.flac'}         | ${['restored.test/DK/DK-1A.flac']}
    ${'restored'} | ${'SER-88A.flac'}       | ${['restored.test/SER/SER-88A.flac']}
    ${'restored'} | ${'ML2-71 A.flac'}      | ${['restored.test/ML2/ML2-71 A.flac']}
    ${'edited'}   | ${'DK-001-1.flac'}      | ${['edited.test/DK/DK-001-1.flac']}
    ${'edited'}   | ${'HI-001-1.flac'}      | ${['edited.test/ML1/HI-001-1.flac']}
    ${'restored'} | ${'HI-001-1.flac'}      | ${['restored.test/ML1/HI-001-1.flac']}
    ${'edited'}   | ${'ML2-1000-2.flac'}    | ${['edited.test/ML2/ML2-1000-2.flac']}
    ${'original'} | ${'DIGI07-0001'}        | ${['original.test/DIGI07/DIGI07-0001.mp3', 'original.test/DIGI07/DIGI07-0001.flac']}
    ${'original'} | ${'DIGI07-0001.mp3'}    | ${['original.test/DIGI07/DIGI07-0001.mp3', 'original.test/DIGI07/DIGI07-0001.flac']}
    ${'original'} | ${'DIGI07-0001.flac'}   | ${['original.test/DIGI07/DIGI07-0001.mp3', 'original.test/DIGI07/DIGI07-0001.flac']}
    ${'original'} | ${'BR-01A'}             | ${['original.test/BR/BR-001A.flac']}
    ${'original'} | ${'BR-01A.flac'}        | ${['original.test/BR/BR-001A.flac']}
    ${'original'} | ${'BR-01A.mp3'}         | ${['original.test/BR/BR-001A.mp3']}
    ${'restored'} | ${'DIGI07-0001'}        | ${['restored.test/DIGI07/DIGI07-0001.mp3', 'restored.test/DIGI07/DIGI07-0001.flac']}
    ${'restored'} | ${'DIGI07-0001.mp3'}    | ${['restored.test/DIGI07/DIGI07-0001.mp3', 'restored.test/DIGI07/DIGI07-0001.flac']}
    ${'restored'} | ${'DIGI07-0001.flac'}   | ${['restored.test/DIGI07/DIGI07-0001.mp3', 'restored.test/DIGI07/DIGI07-0001.flac']}
    ${'restored'} | ${'BR-01A'}             | ${['restored.test/BR/BR-01A.flac']}
    ${'restored'} | ${'BR-01A.flac'}        | ${['restored.test/BR/BR-01A.flac']}
    ${'restored'} | ${'BR-01A.mp3'}         | ${['restored.test/BR/BR-01A.mp3']}
    ${'edited'}   | ${'DIGI07-0001-1'}      | ${['edited.test/DIGI07/DIGI07-0001-1.mp3', 'edited.test/DIGI07/DIGI07-0001-1.flac']}
    ${'edited'}   | ${'DIGI07-0001-1.mp3'}  | ${['edited.test/DIGI07/DIGI07-0001-1.mp3', 'edited.test/DIGI07/DIGI07-0001-1.flac']}
    ${'edited'}   | ${'DIGI07-0001-1.flac'} | ${['edited.test/DIGI07/DIGI07-0001-1.mp3', 'edited.test/DIGI07/DIGI07-0001-1.flac']}
    ${'edited'}   | ${'BR-01-1'}            | ${['edited.test/BR/BR-01-1.flac']}
    ${'edited'}   | ${'BR-01-1.flac'}       | ${['edited.test/BR/BR-01-1.flac']}
    ${'edited'}   | ${'BR-01-1.mp3'}        | ${['edited.test/BR/BR-01-1.mp3']}
    ${'restored'} | ${'DIGI07-0001-1'}      | ${['restored.test/DIGI07/DIGI07-0001-1.mp3', 'restored.test/DIGI07/DIGI07-0001-1.flac']}
    ${'restored'} | ${'DIGI07-0001-1.mp3'}  | ${['restored.test/DIGI07/DIGI07-0001-1.mp3', 'restored.test/DIGI07/DIGI07-0001-1.flac']}
    ${'restored'} | ${'DIGI07-0001-1.flac'} | ${['restored.test/DIGI07/DIGI07-0001-1.mp3', 'restored.test/DIGI07/DIGI07-0001-1.flac']}
    ${'restored'} | ${'BR-01-1'}            | ${['restored.test/BR/BR-01-1.flac']}
    ${'restored'} | ${'BR-01-1.flac'}       | ${['restored.test/BR/BR-01-1.flac']}
    ${'restored'} | ${'BR-01-1.mp3'}        | ${['restored.test/BR/BR-01-1.mp3']}
    ${undefined}  | ${'DIGI07-0001'}        | ${['restored.test/DIGI07/DIGI07-0001.mp3', 'restored.test/DIGI07/DIGI07-0001.flac', 'original.test/DIGI07/DIGI07-0001.mp3', 'original.test/DIGI07/DIGI07-0001.flac']}
    ${undefined}  | ${'DIGI07-0001.mp3'}    | ${['restored.test/DIGI07/DIGI07-0001.mp3', 'restored.test/DIGI07/DIGI07-0001.flac', 'original.test/DIGI07/DIGI07-0001.mp3', 'original.test/DIGI07/DIGI07-0001.flac']}
    ${undefined}  | ${'DIGI07-0001.flac'}   | ${['restored.test/DIGI07/DIGI07-0001.mp3', 'restored.test/DIGI07/DIGI07-0001.flac', 'original.test/DIGI07/DIGI07-0001.mp3', 'original.test/DIGI07/DIGI07-0001.flac']}
    ${undefined}  | ${'BR-01A'}             | ${['restored.test/BR/BR-01A.flac', 'original.test/BR/BR-001A.flac']}
    ${undefined}  | ${'BR-01A.flac'}        | ${['restored.test/BR/BR-01A.flac', 'original.test/BR/BR-001A.flac']}
    ${undefined}  | ${'BR-01A.mp3'}         | ${['restored.test/BR/BR-01A.mp3', 'original.test/BR/BR-001A.mp3']}
    ${undefined}  | ${'DIGI07-0001-1'}      | ${['restored.test/DIGI07/DIGI07-0001-1.mp3', 'restored.test/DIGI07/DIGI07-0001-1.flac', 'edited.test/DIGI07/DIGI07-0001-1.mp3', 'edited.test/DIGI07/DIGI07-0001-1.flac']}
    ${undefined}  | ${'DIGI07-0001-1.mp3'}  | ${['restored.test/DIGI07/DIGI07-0001-1.mp3', 'restored.test/DIGI07/DIGI07-0001-1.flac', 'edited.test/DIGI07/DIGI07-0001-1.mp3', 'edited.test/DIGI07/DIGI07-0001-1.flac']}
    ${undefined}  | ${'DIGI07-0001-1.flac'} | ${['restored.test/DIGI07/DIGI07-0001-1.mp3', 'restored.test/DIGI07/DIGI07-0001-1.flac', 'edited.test/DIGI07/DIGI07-0001-1.mp3', 'edited.test/DIGI07/DIGI07-0001-1.flac']}
    ${undefined}  | ${'BR-01-1'}            | ${['restored.test/BR/BR-01-1.flac', 'edited.test/BR/BR-01-1.flac']}
    ${undefined}  | ${'BR-01-1.flac'}       | ${['restored.test/BR/BR-01-1.flac', 'edited.test/BR/BR-01-1.flac']}
    ${undefined}  | ${'BR-01-1.mp3'}        | ${['restored.test/BR/BR-01-1.mp3', 'edited.test/BR/BR-01-1.mp3']}
  `(
    'for file `$fileName` from `$bucket` bucket should be $candidates',
    ({ bucket, fileName, candidates: expectedCandidates }) => {
      const candidates = StorageManager.getCandidateFiles(fileName, bucket).map(
        (file) => `${file.bucket.name}/${file.name}`
      );

      expect(candidates).toStrictEqual(expectedCandidates);
    }
  );
});

describe('Uploaded SE file', () => {
  test.each`
    sourceFileName                       | destinationFileName
    ${'folder/ISK-22-2_v2.flac'}         | ${'ISK/ISK-22-2.flac'}
    ${'a/b/c/ML2-1059-1.flac'}           | ${'ML2/ML2-1059-1.flac'}
    ${'HI-001-1.flac'}                   | ${'ML1/HI-001-1.flac'}
    ${'ML2-1113-1_v2-2.flac'}            | ${'ML2/ML2-1113-1.flac'}
    ${'DIGI07-0001-1.mp3'}               | ${'DIGI07/DIGI07-0001-1.mp3'}
    ${'DIGI07-0306-1_v2_less_harsh.mp3'} | ${'DIGI07/DIGI07-0306-1.mp3'}
    ${'DIGI08-0015_V3 Sadananda.mp3'}    | ${'DIGI08/DIGI08-0015.mp3'}
    ${'DIGI04-0047-1_v1.2.mp3'}          | ${'DIGI04/DIGI04-0047-1.mp3'}
    ${'test-93-2.flac'}                  | ${'TEST/TEST-93-2.flac'}
  `(
    `$sourceFileName should be saved to $destinationFileName`,
    ({ sourceFileName, destinationFileName }) => {
      const file =
        StorageManager.getDestinationFileForRestoredUpload(sourceFileName);
      expect(file.name).toEqual(destinationFileName);
    }
  );

  test.each`
    sourceFileName
    ${'TST-001-1_1.flac'}
    ${'ML2-97 B_V2.flac'}
    ${'BR-01B v3.flac'}
    ${'DIGI07-0214-1_Sadananda.mp3'}
    ${'DIGI04-0047-1 Sadanand.mp3'}
    ${'BR-49A-2.mp3'}
    ${'RANI-93-2.flac.flac'}
  `(`$sourceFileName should be rejected`, ({ sourceFileName }) => {
    const file =
      StorageManager.getDestinationFileForRestoredUpload(sourceFileName);
    expect(file).toBeNull();
  });
});
