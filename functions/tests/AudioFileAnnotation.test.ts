/*!
 * sri sri guru gauranga jayatah
 */

import { AudioChunkAnnotation } from '../src/AudioFileAnnotation';

describe('Audio Annotation parsing and formatting', () => {
  test.each`
    text                                             | entireFile | beginning    | ending       | type                             | description
    ${'2.9–2.0: blank space — '}                     | ${null}    | ${'2.9'}     | ${'2.0'}     | ${'blank space'}                 | ${''}
    ${'0:07:23–0:07:46: irrelevant — Haribol'}       | ${null}    | ${'0:07:23'} | ${'0:07:46'} | ${'irrelevant'}                  | ${'Haribol'}
    ${'Entire file: Speed is faster than normal — '} | ${true}    | ${null}      | ${null}      | ${'Speed is faster than normal'} | ${''}
  `('$text', ({ text, entireFile, beginning, ending, type, description }) => {
    const parsed = AudioChunkAnnotation.parse(text);
    const constructed = new AudioChunkAnnotation({
      entireFile,
      beginning,
      ending,
      type,
      description,
    });
    const formatted = constructed.toString();
    expect(parsed).toEqual(constructed);
    expect(formatted).toEqual(text);
  });
});
