/*!
 * sri sri guru gauranga jayatah
 */

import { AudioAnnotation, formatAudioAnnotations } from './AudioAnnotation';

describe('Audio Annotation formatting', () => {
  test.each`
    text                                             | entireFile | beginning | ending    | type                             | description
    ${'2:09–3:00: blank space — '}                   | ${null}    | ${'2:09'} | ${'3:00'} | ${'blank space'}                 | ${''}
    ${'7:23–7:46: irrelevant — Haribol'}             | ${null}    | ${'7:23'} | ${'7:46'} | ${'irrelevant'}                  | ${'Haribol'}
    ${'Entire file: Speed is faster than normal — '} | ${true}    | ${null}   | ${null}   | ${'Speed is faster than normal'} | ${''}
  `('$text', ({ text, ...annotation }) => {
    expect(formatAudioAnnotations(annotation as AudioAnnotation)).toEqual(text);
  });
});
