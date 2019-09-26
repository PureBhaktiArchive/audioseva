/*!
 * sri sri guru gauranga jayatah
 */

import { AudioAnnotation, AudioAnnotationArray } from '../src/AudioAnnotation';

describe('Audio Annotation parsing and formatting', () => {
  test.each`
    text                                             | entireFile | beginning    | ending       | type                             | description
    ${'2.9–2.0: blank space — '}                     | ${null}    | ${'2.9'}     | ${'2.0'}     | ${'blank space'}                 | ${''}
    ${'0:07:23–0:07:46: irrelevant — Haribol'}       | ${null}    | ${'0:07:23'} | ${'0:07:46'} | ${'irrelevant'}                  | ${'Haribol'}
    ${'Entire file: Speed is faster than normal — '} | ${true}    | ${null}      | ${null}      | ${'Speed is faster than normal'} | ${''}
  `('$text', ({ text, entireFile, beginning, ending, type, description }) => {
    const parsed = AudioAnnotation.parse(text);
    const constructed = new AudioAnnotation({
      entireFile,
      beginning,
      ending,
      type,
      description,
    });
    expect(parsed).toEqual(constructed);
    expect(constructed.toString()).toEqual(text);
    expect(`${constructed}`).toEqual(text);
  });

  test('in array', () => {
    const source =
      '2:30–4:50: Noise — Description\n5:20–17:01: Blank — Another';
    const annotations = AudioAnnotationArray.parse(source);
    expect(annotations.length).toBe(2);
    expect(annotations[1].ending).toBe('17:01');

    expect(annotations.toString()).toEqual(source);
    expect(`${annotations}`).toEqual(source);
  });
});
