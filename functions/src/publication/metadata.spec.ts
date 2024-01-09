/*!
 * sri sri guru gaurangau jayatah
 */

import { AudioRecord } from './AudioRecord';
import {
  abbreviateLanguages,
  composeFileName,
  composeMediaMetadata,
} from './metadata';

describe('Languages', () => {
  it.each`
    languages                                    | abbreviation
    ${['English']}                               | ${'ENG'}
    ${['Hindi']}                                 | ${'HIN'}
    ${['Bengali']}                               | ${'BEN'}
    ${['French']}                                | ${'FRA'}
    ${['German']}                                | ${'DEU'}
    ${['Hindi', 'English']}                      | ${'HIN,ENG'}
    ${['English', 'Hindi']}                      | ${'HIN,ENG'}
    ${['Hindi', 'Bengali']}                      | ${'HIN,BEN'}
    ${['Bengali', 'Hindi']}                      | ${'HIN,BEN'}
    ${['English', 'Bengali']}                    | ${'ENG,BEN'}
    ${['Bengali', 'English']}                    | ${'ENG,BEN'}
    ${['English', 'Russian']}                    | ${'ENG,RUS'}
    ${['Spanish', 'English']}                    | ${'ENG,SPA'}
    ${['SPANISH', 'English']}                    | ${'ENG,SPA'}
    ${['Bengali', 'Hindi', 'English']}           | ${'HIN,ENG,BEN'}
    ${['English', 'Hindi', 'Spanish']}           | ${'HIN,ENG,SPA'}
    ${['English', 'French', 'Bengali', 'Hindi']} | ${'HIN,ENG,BEN,FRA'}
    ${['Non-existent']}                          | ${null}
    ${[]}                                        | ${null}
  `(
    '$languages should be abbreviated as "$abbreviation"',
    ({ languages, abbreviation }) => {
      expect(abbreviateLanguages(languages)).toBe(abbreviation);
    }
  );
});

describe('File', () => {
  it.each`
    id   | date            | timeOfDay | languages               | title                          | location       | filename
    ${1} | ${'1998-06-22'} | ${'AM'}   | ${['English']}          | ${'Deep moods of Gopi Gita'}   | ${'Badger'}    | ${'1998-06-22 AM ENG — Deep moods of Gopi Gita, Badger (#0001).mp3'}
    ${2} | ${'2000-11'}    | ${null}   | ${['English', 'Hindi']} | ${'Kartika Mahima'}            | ${'Vrindavan'} | ${'2000-11 HIN,ENG — Kartika Mahima, Vrindavan (#0002).mp3'}
    ${3} | ${'1991'}       | ${null}   | ${['Hindi']}            | ${'Ragavartma Candrika'}       | ${'Mathura'}   | ${'1991 HIN — Ragavartma Candrika, Mathura (#0003).mp3'}
    ${4} | ${null}         | ${null}   | ${['English']}          | ${'Another lecture'}           | ${null}        | ${'UNDATED ENG — Another lecture (#0004).mp3'}
    ${5} | ${null}         | ${null}   | ${[]}                   | ${'Reserved\\/?*:|"<> inside'} | ${null}        | ${'UNDATED — Reserved inside (#0005).mp3'}
  `(
    '$id should have file name "$filename"',
    ({ id, date, timeOfDay, languages, title, location, filename }) => {
      const record: AudioRecord = {
        id,
        sourceFileId: '',
        date,
        timeOfDay,
        dateUncertain: false,
        languages,
        title,
        location,
        locationUncertain: false,
        topics: '',
        category: '',
        percentage: 1,
        soundQualityRating: 'Good',
      };

      expect(composeFileName(record)).toBe(filename);
    }
  );

  it.each`
    id   | date            | title
    ${1} | ${'1998-06-22'} | ${'Deep moods of Gopi Gita'}
    ${2} | ${'2000-11'}    | ${'Kartika Mahima'}
    ${3} | ${'1991'}       | ${'Ragavartma Candrika'}
    ${4} | ${null}         | ${'Another lecture'}
  `(
    '$id should have proper media metadata',
    ({ id, date, title }: Partial<AudioRecord>) => {
      const record: AudioRecord = {
        id,
        sourceFileId: '',
        date,
        dateUncertain: false,
        timeOfDay: '',
        languages: [],
        title,
        location: '',
        locationUncertain: false,
        topics: '',
        category: '',
        percentage: 1,
        soundQualityRating: 'Good',
      };

      expect(composeMediaMetadata(record)).toEqual({
        'BVNM Archive ID': String(id),
        title: title,
        date: date?.substring(0, 4),
      });
    }
  );
});
