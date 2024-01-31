/*!
 * sri sri guru gauranga jayatah
 */

import { DateTime } from 'luxon';
import { ContentDetails, FinalContentDetails } from '../ContentDetails';
import {
  FidelityCheck,
  FidelityCheckRecord,
  Replacement,
} from '../FidelityCheck/FidelityCheckRecord';
import { StorageFileReference } from '../StorageFileReference';
import {
  ActiveRecord,
  AudioRecord,
  InactiveRecord,
  RedirectionRecord,
} from './AudioRecord';
import { finalizeAudios } from './finalization';

describe('Finalization', () => {
  const contentDetails1: ContentDetails = {
    topics: '- Some topics',
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
    topics: '- Another topics',
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
    otherSpeakers: 'Speaker 1 & Speaker 2',
  };
  const contentDetails3: ContentDetails = {
    topics: '- Third topics',
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

  const contentDetails1Final: FinalContentDetails = {
    ...contentDetails1,
    date: '1998-08-30',
    languages: ['Hindi', 'English'],
    otherSpeakers: null,
  };
  const contentDetails2Final: FinalContentDetails = {
    ...contentDetails2,
    date: '1996-05-14',
    languages: ['English'],
    otherSpeakers: ['Speaker 1', 'Speaker 2'],
  };
  const contentDetails3Final: FinalContentDetails = {
    ...contentDetails3,
    date: '2000-10-13',
    languages: ['English'],
    otherSpeakers: null,
  };

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
      duration: 3705,
    },
  ];

  const inactive = (id: number, sourceFileId: string): InactiveRecord => ({
    id,
    sourceFileId,
    status: 'inactive',
  });

  const active = (
    id: number,
    sourceFileId: string,
    contentDetails: FinalContentDetails
  ): ActiveRecord => ({
    id,
    sourceFileId,
    status: 'active',
    ...contentDetails,
    duration: 3705,
  });

  const redir = (
    id: number,
    sourceFileId: string,
    redirectTo: number
  ): RedirectionRecord => ({
    id,
    sourceFileId,
    status: 'redirect',
    redirectTo,
  });

  const runTestCases = (
    cases: {
      name: string;
      fcrs: [string, FidelityCheckRecord][];
      before: AudioRecord[];
      after: AudioRecord[];
    }[]
  ) =>
    // Iterating because $variable seems to not be supported for a table from a variable in our version of Jest.
    // See https://github.com/jestjs/jest/issues/12562
    cases.forEach(({ name, fcrs, before, after }) =>
      test(`${name}`, () =>
        expect([...finalizeAudios(new Map(fcrs), before)]).toStrictEqual(after))
    );

  describe('Simple updates', () => {
    runTestCases([
      {
        name: 'Ignoring an unapproved record',
        fcrs: [fcr('A')],
        before: [],
        after: [],
      },
      {
        name: 'Unpublishing an unapproved record',
        fcrs: [fcr('A')],
        before: [active(5, 'A', contentDetails1Final)],
        after: [inactive(5, 'A')],
      },
      {
        name: 'Unpublishing a missing record',
        fcrs: [],
        before: [active(5, 'A', contentDetails1Final)],
        after: [inactive(5, 'A')],
      },
      {
        name: 'Publishing a previously unpublished record',
        fcrs: [fcr('A', contentDetails1)],
        before: [inactive(5, 'A')],
        after: [active(5, 'A', contentDetails1Final)],
      },
      {
        name: 'Publishing an approved record',
        fcrs: [fcr('A', contentDetails1)],
        before: [],
        after: [active(1, 'A', contentDetails1Final)],
      },
      {
        name: 'Keeping a published record',
        fcrs: [fcr('A', contentDetails1)],
        before: [active(5, 'A', contentDetails1Final)],
        after: [active(5, 'A', contentDetails1Final)],
      },
      {
        name: 'Updating a published record',
        fcrs: [fcr('A', contentDetails3)],
        before: [active(5, 'A', contentDetails1Final)],
        after: [active(5, 'A', contentDetails3Final)],
      },
      {
        name: 'Undoing a redirect for a missing record',
        fcrs: [],
        before: [redir(5, 'A', 46)],
        after: [inactive(5, 'A')],
      },
      {
        name: 'Keeping assignments untouched',
        fcrs: [],
        before: [inactive(5, 'A')],
        after: [inactive(5, 'A')],
      },
    ]);
  });

  describe('Simple replacement', () => {
    runTestCases([
      /** Published → not published */
      {
        name: 'Unpublishing an approved record replaced with a missing one',
        fcrs: [fcr('A', contentDetails1, repl('B'))],
        before: [active(5, 'A', contentDetails1Final)],
        after: [inactive(5, 'A')],
      },
      {
        name: 'Unpublishing an approved record replaced with an unapproved one',
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B')],
        before: [active(5, 'A', contentDetails1Final)],
        after: [inactive(5, 'A')],
      },
      {
        name: 'Unpublishing an unapproved record replaced with an unapproved one',
        fcrs: [fcr('A', undefined, repl('B')), fcr('B')],
        before: [active(5, 'A', contentDetails1Final)],
        after: [inactive(5, 'A')],
      },
      {
        name: 'Replacing an approved record with another approved one',
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B', contentDetails2)],
        before: [active(5, 'A', contentDetails1Final)],
        after: [active(5, 'B', contentDetails2Final)],
      },
      {
        name: 'Replacing an unapproved record with an approved one',
        fcrs: [fcr('A', undefined, repl('B')), fcr('B', contentDetails2)],
        before: [active(5, 'A', contentDetails1Final)],
        after: [active(5, 'B', contentDetails2Final)],
      },

      /** Not published → not published */

      {
        name: 'Not publishing a missing record replacing an approved one',
        fcrs: [fcr('A', contentDetails1, repl('B'))],
        before: [],
        after: [],
      },
      {
        name: 'Not publishing a missing record replacing an unapproved one',
        fcrs: [fcr('A', undefined, repl('B'))],
        before: [],
        after: [],
      },
      {
        name: 'Not publishing an unapproved record replacing an approved one',
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B')],
        before: [],
        after: [],
      },
      {
        name: 'Not publishing an unapproved record replacing an unapproved one',
        fcrs: [fcr('A', undefined, repl('B')), fcr('B')],
        before: [],
        after: [],
      },
      {
        name: 'Publishing an approved record replacing an approved one',
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B', contentDetails2)],
        before: [],
        after: [active(1, 'B', contentDetails2Final)],
      },
      {
        name: 'Publishing an approved record replacing an unapproved one',
        fcrs: [fcr('A', undefined, repl('B')), fcr('B', contentDetails2)],
        before: [],
        after: [active(1, 'B', contentDetails2Final)],
      },
    ]);
  });

  describe('Chained replacements', () => {
    runTestCases([
      {
        name: 'All approved and published',
        fcrs: [
          fcr('A', contentDetails1, repl('B')),
          fcr('B', contentDetails2, repl('C')),
          fcr('C', contentDetails3),
        ],
        before: [active(5, 'A', contentDetails1Final)],
        after: [active(5, 'C', contentDetails3Final)],
      },
      {
        name: 'All approved but not published',
        fcrs: [
          fcr('A', contentDetails1, repl('B')),
          fcr('B', contentDetails2, repl('C')),
          fcr('C', contentDetails3),
        ],
        before: [],
        after: [active(1, 'C', contentDetails3Final)],
      },
      {
        name: 'Unpublished record through a published one',
        fcrs: [
          fcr('A', contentDetails1, repl('B')),
          fcr('B', contentDetails2, repl('C')),
          fcr('C', contentDetails3),
        ],
        before: [active(89, 'B', contentDetails2Final)],
        after: [active(89, 'C', contentDetails3Final)],
      },
      {
        name: 'Missing record in the end',
        fcrs: [
          fcr('A', contentDetails1, repl('B')),
          fcr('B', contentDetails2, repl('C')),
        ],
        before: [active(5, 'A', contentDetails1Final)],
        after: [inactive(5, 'A')],
      },
    ]);
  });

  describe('Merges', () => {
    runTestCases([
      {
        name: 'simple',
        fcrs: [
          fcr('A', contentDetails1, repl('C')),
          fcr('B', contentDetails2, repl('C')),
          fcr('C', contentDetails3),
        ],
        before: [
          active(5, 'A', contentDetails1Final),
          active(89, 'B', contentDetails2Final),
        ],
        after: [active(5, 'C', contentDetails3Final), redir(89, 'B', 5)],
      },
      {
        name: 'into a missing record',
        fcrs: [
          fcr('A', contentDetails1, repl('C')),
          fcr('B', contentDetails2, repl('C')),
        ],
        before: [
          active(5, 'A', contentDetails1Final),
          active(89, 'B', contentDetails2Final),
        ],
        after: [inactive(5, 'A'), inactive(89, 'B')],
      },
    ]);
  });

  describe('Redirects', () => {
    runTestCases([
      {
        name: 'to a forward record',
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B', contentDetails2)],
        before: [
          active(5, 'A', contentDetails1Final),
          active(89, 'B', contentDetails2Final),
        ],
        after: [redir(5, 'A', 89), active(89, 'B', contentDetails2Final)],
      },
      {
        name: 'to a past record',
        fcrs: [fcr('A', contentDetails1), fcr('B', contentDetails2, repl('A'))],
        before: [
          active(5, 'A', contentDetails1Final),
          active(89, 'B', contentDetails2Final),
        ],
        after: [active(5, 'A', contentDetails1Final), redir(89, 'B', 5)],
      },
      {
        name: 'to a missing published record',
        fcrs: [fcr('B', contentDetails2, repl('A'))],
        before: [
          active(5, 'A', contentDetails1Final),
          active(89, 'B', contentDetails2Final),
        ],
        after: [inactive(5, 'A'), inactive(89, 'B')],
      },
      {
        name: 'to an unapproved record',
        fcrs: [fcr('B', contentDetails2, repl('A')), fcr('B')],
        before: [
          active(5, 'A', contentDetails1Final),
          active(89, 'B', contentDetails2Final),
        ],
        after: [inactive(5, 'A'), inactive(89, 'B')],
      },
      {
        name: 'to an inactive record',
        fcrs: [fcr('B', contentDetails2, repl('A')), fcr('B')],
        before: [active(5, 'A', contentDetails1Final), inactive(89, 'B')],
        after: [inactive(5, 'A'), inactive(89, 'B')],
      },
      {
        name: 'Removing a redirection',
        fcrs: [fcr('A', contentDetails1), fcr('B', contentDetails2)],
        before: [redir(5, 'A', 89), active(89, 'B', contentDetails2Final)],
        after: [
          active(5, 'A', contentDetails1Final),
          active(89, 'B', contentDetails2Final),
        ],
      },
    ]);
  });

  describe('Invalid cases', () => {
    const runTestCases = (
      cases: {
        name: string;
        fcrs: [string, FidelityCheckRecord][];
        before: AudioRecord[];
      }[],
      errorRegexp: RegExp
    ) =>
      cases.forEach(({ name, fcrs, before }) =>
        test(`${name}`, () =>
          expect(() => [...finalizeAudios(new Map(fcrs), before)]).toThrow(
            errorRegexp
          ))
      );

    describe('Throws on circular replacement', () => {
      runTestCases(
        [
          {
            name: 'Three records',
            fcrs: [
              fcr('A', undefined, repl('B')),
              fcr('B', undefined, repl('C')),
              fcr('C', undefined, repl('A')),
            ],
            before: [inactive(5, 'A')],
          },
          {
            name: 'Two records',
            fcrs: [
              fcr('A', undefined, repl('B')),
              fcr('B', undefined, repl('A')),
            ],
            before: [inactive(5, 'A')],
          },
          {
            name: 'Self',
            fcrs: [fcr('A', undefined, repl('A'))],
            before: [inactive(5, 'A')],
          },
        ],
        /circular/i
      );
    });
  });
});
