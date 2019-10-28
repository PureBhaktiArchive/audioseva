import { extractListFromFilename, standardizeFileName } from './helpers';

describe('List extraction', () => {
  test.each`
    fileName                   | list
    ${'HI445A'}                | ${'ML1'}
    ${'ML2-1A (2)'}            | ${'ML2'}
    ${'SER-88A'}               | ${'SER'}
    ${'19960528LEICESTER_T36'} | ${null}
  `('extracts $list from $fileName', ({ fileName, list }) => {
    expect(extractListFromFilename(fileName)).toEqual(list);
  });
});

describe('File name standardization', () => {
  test.each`
    input         | standard
    ${'Hi3 A'}    | ${'ML1-003A'}
    ${'BR-01A'}   | ${'BR-001A'}
    ${'DK-1A'}    | ${'DK-001A'}
    ${'SER-88A'}  | ${'SER-088A'}
    ${'ML2-71 A'} | ${'ML2-0071A'}
  `('$input → $standard', ({ input, standard }) => {
    expect(standardizeFileName(`${input}.mp3`)).toEqual(`${standard}.mp3`);
  });
});
