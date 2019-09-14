/*!
 * sri sri guru gauranga jayatah
 */

import { AudioAnnotation, AudioAnnotationArray } from '../src/AudioAnnotation';

describe('Audio Annotation parsing and formatting', () => {
  test.each`
    text                                             | entireFile | beginning | ending  | type                             | description  | formatted
    ${'2:09–3:00: blank space — '}                   | ${null}    | ${129}    | ${180}  | ${'blank space'}                 | ${''}        | ${null}
    ${'0:07:23–0:07:46: irrelevant — Haribol'}       | ${null}    | ${443}    | ${466}  | ${'irrelevant'}                  | ${'Haribol'} | ${'7:23–7:46: irrelevant — Haribol'}
    ${'Entire file: Speed is faster than normal — '} | ${true}    | ${null}   | ${null} | ${'Speed is faster than normal'} | ${''}        | ${'Entire file: Speed is faster than normal — '}
  `(
    '$text',
    ({ text, entireFile, beginning, ending, type, description, formatted }) => {
      const parsed = AudioAnnotation.parse(text);
      const constructed = new AudioAnnotation({
        entireFile,
        beginning,
        ending,
        type,
        description,
      });
      expect(parsed).toEqual(constructed);
      expect(constructed.toString()).toEqual(formatted || text);
      expect(`${constructed}`).toEqual(formatted || text);
    }
  );

  test('in array', () => {
    const source =
      '2:30–4:50: Noise — Description\n5:20–17:01: Blank — Another';
    const annotations = AudioAnnotationArray.parse(source);
    expect(annotations.length).toBe(2);
    expect(annotations[1].ending).toBe(1021); // 17:01

    expect(annotations.toString()).toEqual(source);
    expect(`${annotations}`).toEqual(source);
  });
});
