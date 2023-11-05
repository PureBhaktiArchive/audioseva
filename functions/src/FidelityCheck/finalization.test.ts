/*!
 * sri sri guru gauranga jayatah
 */

import { DateTime } from 'luxon';
import { StorageFileReference } from '../StorageFileReference';
import { ContentDetails } from './ContentDetails';
import {
  FidelityCheck,
  FidelityCheckRecord,
  Replacement,
} from './FidelityCheckRecord';
import { FinalRecord } from './FinalRecord';
import { createFinalRecords } from './finalization';

describe('Finalization', () => {
  const contentDetails1: ContentDetails = {
    topics: 'Some topics',
    title: 'Some title',
    date: '19980830',
    dateUncertain: false,
    location: 'Mathura',
    locationUncertain: false,
    category: 'Lecture',
    languages: 'Hindi,English',
    percentage: 5,
    soundQualityRating: 'Average',
    timeOfDay: 'AM',
  };
  const contentDetails2: ContentDetails = {
    topics: 'Another topics',
    title: 'Another title',
    date: '19960514',
    dateUncertain: false,
    location: 'Holland',
    locationUncertain: false,
    category: 'Lecture',
    languages: 'English',
    percentage: 100,
    soundQualityRating: 'Good',
    timeOfDay: 'AM',
  };
  const contentDetails3: ContentDetails = {
    topics: 'Third topics',
    title: 'Third title',
    date: '20001013',
    dateUncertain: true,
    location: 'Vrindavan',
    locationUncertain: false,
    category: 'Darshan',
    languages: 'English',
    percentage: 100,
    soundQualityRating: 'Good',
    timeOfDay: 'PM',
  };

  const contentDetails1Final = { ...contentDetails1, date: '1998-08-30' };
  const contentDetails2Final = { ...contentDetails2, date: '1996-05-14' };
  const contentDetails3Final = { ...contentDetails3, date: '2000-10-13' };

  const file = (taskId: string): StorageFileReference => ({
    name: `${taskId}.flac`,
    bucket: 'bucket',
    generation: 123,
  });
  const fidelityCheck: FidelityCheck = { author: 'someone', timestamp: 123 };
  const approval = { timestamp: DateTime.now().valueOf() };

  const repl = (taskId: string): Replacement => ({
    taskId,
    timestamp: DateTime.now().valueOf(),
  });

  const fcr = (
    taskId: string,
    contentDetails?: ContentDetails,
    replacement?: Replacement
  ): [string, FidelityCheckRecord] => [
    taskId,
    {
      ...(contentDetails
        ? {
            approval,
            contentDetails,
          }
        : {}),
      file: file(taskId),
      fidelityCheck,
      replacement,
    },
  ];

  const final = (
    fileId: number,
    taskId: string,
    contentDetails?: ContentDetails
  ): [number, FinalRecord] => [
    fileId,
    {
      taskId,
      file: file(taskId),
      ...(contentDetails ? { contentDetails } : {}),
    },
  ];

  const doTest = (
    cases: {
      fcrs: [string, FidelityCheckRecord][];
      before: [number, FinalRecord][];
      after: [number, FinalRecord][];
    }[]
  ) =>
    test.each(cases)(
      '%#', // Using this specifier because $variable seems to not be supported in our version of Jest. See https://github.com/jestjs/jest/issues/12562
      ({ fcrs, before, after }) => {
        expect([...createFinalRecords(fcrs, before)]).toStrictEqual(after);
      }
    );

  describe('No replacement', () => {
    doTest([
      // Ignoring not approved
      {
        fcrs: [fcr('A')],
        before: [],
        after: [],
      },
      // Unpublishing not approved
      {
        fcrs: [fcr('A')],
        before: [final(5, 'A', contentDetails1Final)],
        after: [final(5, 'A')],
      },
      // Publishing newly approved
      {
        fcrs: [fcr('A', contentDetails1)],
        before: [],
        after: [final(1, 'A', contentDetails1Final)],
      },
      // Keeping published and approved
      {
        fcrs: [fcr('A', contentDetails1)],
        before: [final(5, 'A', contentDetails1Final)],
        after: [final(5, 'A', contentDetails1Final)],
      },
      // Updating existing published record
      {
        fcrs: [fcr('A', contentDetails3)],
        before: [final(5, 'A', contentDetails1Final)],
        after: [final(5, 'A', contentDetails3Final)],
      },
    ]);
  });

  describe('Simple replacement', () => {
    doTest([
      /** Published → not published */
      // Unpublishing an approved record replaced with a not approved one
      {
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B')],
        before: [final(5, 'A', contentDetails1Final)],
        after: [final(5, 'B')],
      },
      // Unpublishing a not approved record replaced with a not approved one
      {
        fcrs: [fcr('A', undefined, repl('B')), fcr('B')],
        before: [final(5, 'A', contentDetails1Final)],
        after: [final(5, 'B')],
      },
      // Replacing an approved record with another approved one
      {
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B', contentDetails2)],
        before: [final(5, 'A', contentDetails1Final)],
        after: [final(5, 'B', contentDetails2Final)],
      },
      // Replacing a not approved record with an approved one
      {
        fcrs: [fcr('A', undefined, repl('B')), fcr('B', contentDetails2)],
        before: [final(5, 'A', contentDetails1Final)],
        after: [final(5, 'B', contentDetails2Final)],
      },

      /** Not published → not published */
      // approved → not approved
      {
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B')],
        before: [],
        after: [],
      },
      // not approved → not approved
      {
        fcrs: [fcr('A', undefined, repl('B')), fcr('B')],
        before: [],
        after: [],
      },
      // approved → approved
      {
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B', contentDetails2)],
        before: [],
        after: [final(1, 'B', contentDetails2Final)],
      },
      // not approved → approved
      {
        fcrs: [fcr('A', undefined, repl('B')), fcr('B', contentDetails2)],
        before: [],
        after: [final(1, 'B', contentDetails2Final)],
      },
    ]);
  });
});
