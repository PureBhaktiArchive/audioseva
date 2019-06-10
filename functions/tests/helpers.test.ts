import { extractListFromFilename } from "../src/helpers";

describe('List extraction', () => {
  test.each`
    fileName        | list
    ${'HI445A'}     | ${'ML1'}
    ${'ML2-1A (2)'} | ${'ML2'}
    ${'SER-88A'}    | ${'SER'}
    ${'19960528LEICESTER_T36'} | ${null}
  `('extracts $list from $fileName', ({ fileName, list }) => {
    expect(extractListFromFilename(fileName)).toEqual(list);
  });
});

