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
import {
  AssignmentRecord,
  FinalRecord,
  NormalRecord,
  RedirectRecord,
} from './FinalRecord';
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

  const assign = (
    fileId: number,
    taskId: string
  ): [number, AssignmentRecord] => [fileId, { taskId }];

  const final = (
    fileId: number,
    taskId: string,
    contentDetails?: ContentDetails
  ): [number, NormalRecord] => [
    fileId,
    { taskId, file: file(taskId), contentDetails },
  ];

  const redir = (
    fileId: number,
    redirectTo: number
  ): [number, RedirectRecord] => [fileId, { redirectTo }];

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

  describe('Simple updates', () => {
    doTest([
      // Ignoring an unapproved record
      {
        fcrs: [fcr('A')],
        before: [],
        after: [],
      },
      // Unpublishing an unapproved record
      {
        fcrs: [fcr('A')],
        before: [final(5, 'A', contentDetails1Final)],
        after: [assign(5, 'A')],
      },
      // Unpublishing a missing record
      {
        fcrs: [],
        before: [final(5, 'A', contentDetails1Final)],
        after: [assign(5, 'A')],
      },
      // Publishing a previously unpublished record
      {
        fcrs: [fcr('A', contentDetails1)],
        before: [assign(5, 'A')],
        after: [final(5, 'A', contentDetails1Final)],
      },
      // Publishing an approved record
      {
        fcrs: [fcr('A', contentDetails1)],
        before: [],
        after: [final(1, 'A', contentDetails1Final)],
      },
      // Keeping a published record
      {
        fcrs: [fcr('A', contentDetails1)],
        before: [final(5, 'A', contentDetails1Final)],
        after: [final(5, 'A', contentDetails1Final)],
      },
      // Updating a published record
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
      // Unpublishing an approved record replaced with a missing one
      {
        fcrs: [fcr('A', contentDetails1, repl('B'))],
        before: [final(5, 'A', contentDetails1Final)],
        after: [assign(5, 'B')],
      },
      // Unpublishing an approved record replaced with an unapproved one
      {
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B')],
        before: [final(5, 'A', contentDetails1Final)],
        after: [assign(5, 'B')],
      },
      // Unpublishing an unapproved record replaced with an unapproved one
      {
        fcrs: [fcr('A', undefined, repl('B')), fcr('B')],
        before: [final(5, 'A', contentDetails1Final)],
        after: [assign(5, 'B')],
      },
      // Replacing an approved record with another approved one
      {
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B', contentDetails2)],
        before: [final(5, 'A', contentDetails1Final)],
        after: [final(5, 'B', contentDetails2Final)],
      },
      // Replacing an unapproved record with an approved one
      {
        fcrs: [fcr('A', undefined, repl('B')), fcr('B', contentDetails2)],
        before: [final(5, 'A', contentDetails1Final)],
        after: [final(5, 'B', contentDetails2Final)],
      },

      /** Not published → not published */

      // Not publishing a missing record replacing an approved one
      {
        fcrs: [fcr('A', contentDetails1, repl('B'))],
        before: [],
        after: [],
      },
      // Not publishing a missing record replacing an unapproved one
      {
        fcrs: [fcr('A', undefined, repl('B'))],
        before: [],
        after: [],
      },
      // Not publishing an unapproved record replacing an approved one
      {
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B')],
        before: [],
        after: [],
      },
      // Not publishing an unapproved record replacing an unapproved one
      {
        fcrs: [fcr('A', undefined, repl('B')), fcr('B')],
        before: [],
        after: [],
      },
      // Publishing an approved record replacing an approved one
      {
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B', contentDetails2)],
        before: [],
        after: [final(1, 'B', contentDetails2Final)],
      },
      // Publishing an approved record replacing an unapproved one
      {
        fcrs: [fcr('A', undefined, repl('B')), fcr('B', contentDetails2)],
        before: [],
        after: [final(1, 'B', contentDetails2Final)],
      },
    ]);
  });

  describe('Complex replacements', () => {
    doTest([
      // Chain replacement
      {
        fcrs: [
          fcr('A', contentDetails1, repl('B')),
          fcr('B', contentDetails2, repl('C')),
          fcr('C', contentDetails3),
        ],
        before: [final(5, 'A', contentDetails1Final)],
        after: [final(5, 'C', contentDetails3Final)],
      },
      // Chain replacement with a missing record
      {
        fcrs: [
          fcr('A', contentDetails1, repl('B')),
          fcr('B', contentDetails2, repl('C')),
        ],
        before: [final(5, 'A', contentDetails1Final)],
        after: [assign(5, 'C')],
      },
      // Merger
      {
        fcrs: [
          fcr('A', contentDetails1, repl('C')),
          fcr('B', contentDetails2, repl('C')),
          fcr('C', contentDetails3),
        ],
        before: [
          final(5, 'A', contentDetails1Final),
          final(89, 'B', contentDetails2Final),
        ],
        after: [final(5, 'C', contentDetails3Final), redir(89, 5)],
      },
      // Merger into a missing record
      {
        fcrs: [
          fcr('A', contentDetails1, repl('C')),
          fcr('B', contentDetails2, repl('C')),
        ],
        before: [
          final(5, 'A', contentDetails1Final),
          final(89, 'B', contentDetails2Final),
        ],
        after: [assign(5, 'C'), redir(89, 5)],
      },
      // Redirect to the forward record
      {
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B', contentDetails2)],
        before: [
          final(5, 'A', contentDetails1Final),
          final(89, 'B', contentDetails2Final),
        ],
        after: [redir(5, 89), final(89, 'B', contentDetails2Final)],
      },
      // Redirect to the past record
      {
        fcrs: [fcr('A', contentDetails1), fcr('B', contentDetails2, repl('A'))],
        before: [
          final(5, 'A', contentDetails1Final),
          final(89, 'B', contentDetails2Final),
        ],
        after: [final(5, 'A', contentDetails1Final), redir(89, 5)],
      },
      // Redirect to a missing record
      {
        fcrs: [fcr('A', contentDetails1), fcr('B', contentDetails2, repl('A'))],
        before: [
          final(5, 'A', contentDetails1Final),
          final(89, 'B', contentDetails2Final),
        ],
        after: [final(5, 'A', contentDetails1Final), redir(89, 5)],
      },
    ]);
  });

  describe('Invalid cases', () => {
    const doTest = (
      cases: {
        fcrs: [string, FidelityCheckRecord][];
        before: [number, FinalRecord][];
      }[],
      errorRegexp: RegExp
    ) =>
      test.each(cases)(
        '%#', // Using this specifier because $variable seems to not be supported in our version of Jest. See https://github.com/jestjs/jest/issues/12562
        ({ fcrs, before }) => {
          expect(() => [...createFinalRecords(fcrs, before)]).toThrow(
            errorRegexp
          );
        }
      );

    describe('Throws on circular replacement', () => {
      doTest(
        [
          {
            fcrs: [
              fcr('A', undefined, repl('B')),
              fcr('B', undefined, repl('C')),
              fcr('C', undefined, repl('A')),
            ],
            before: [assign(5, 'A')],
          },
          {
            fcrs: [
              fcr('A', undefined, repl('B')),
              fcr('B', undefined, repl('A')),
            ],
            before: [assign(5, 'A')],
          },
          {
            fcrs: [fcr('A', undefined, repl('A'))],
            before: [assign(5, 'A')],
          },
        ],
        /circular/i
      );
    });
  });
});
