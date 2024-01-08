/*!
 * sri sri guru gauranga jayatah
 */

import { DateTime } from 'luxon';
import { StorageFileReference } from '../StorageFileReference';
import { ContentDetails, FinalContentDetails } from './ContentDetails';
import {
  FidelityCheck,
  FidelityCheckRecord,
  Replacement,
} from './FidelityCheckRecord';
import { FinalRecord } from './FinalRecord';
import {
  FinalizationResult,
  createFinalRecords,
  emptyContentDetails,
} from './finalization';

describe('Finalization', () => {
  const approvalDate = new Date();

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
  const approval = { timestamp: approvalDate.valueOf() };

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

  const assign = (id: number, taskId: string): FinalRecord => ({
    id,
    sourceFileId: taskId,
    redirectTo: null,
    approvalDate: null,
    ...emptyContentDetails,
  });

  const final = (
    id: number,
    taskId: string,
    contentDetails: FinalContentDetails
  ): FinalRecord => ({
    id,
    sourceFileId: taskId,
    approvalDate: approvalDate.toISOString(),
    ...contentDetails,
    redirectTo: null,
  });

  const redir = (
    id: number,
    taskId: string,
    redirectTo: number
  ): FinalRecord => ({
    id,
    sourceFileId: taskId,
    approvalDate: null,
    redirectTo,
    ...emptyContentDetails,
  });

  const res = (
    isNew: boolean,
    record: FinalRecord,
    effectiveTaskId: string
  ): FinalizationResult => ({
    isNew,
    record,
    file: effectiveTaskId ? file(effectiveTaskId) : null,
  });

  const create = (record: FinalRecord, effectiveTaskId?: string) =>
    res(true, record, effectiveTaskId);
  const update = (record: FinalRecord, effectiveTaskId?: string) =>
    res(false, record, effectiveTaskId);

  const runTestCases = (
    cases: {
      name: string;
      fcrs: [string, FidelityCheckRecord][];
      before: FinalRecord[];
      after: FinalizationResult[];
    }[]
  ) =>
    // Iterating because $variable seems to not be supported for a table from a variable in our version of Jest.
    // See https://github.com/jestjs/jest/issues/12562
    cases.forEach(({ name, fcrs, before, after }) =>
      test(`${name}`, () =>
        expect([...createFinalRecords(new Map(fcrs), before)]).toStrictEqual(
          after
        ))
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
        before: [final(5, 'A', contentDetails1Final)],
        after: [update(assign(5, 'A'))],
      },
      {
        name: 'Unpublishing a missing record',
        fcrs: [],
        before: [final(5, 'A', contentDetails1Final)],
        after: [update(assign(5, 'A'))],
      },
      {
        name: 'Publishing a previously unpublished record',
        fcrs: [fcr('A', contentDetails1)],
        before: [assign(5, 'A')],
        after: [update(final(5, 'A', contentDetails1Final))],
      },
      {
        name: 'Publishing an approved record',
        fcrs: [fcr('A', contentDetails1)],
        before: [],
        after: [create(final(1, 'A', contentDetails1Final))],
      },
      {
        name: 'Keeping a published record',
        fcrs: [fcr('A', contentDetails1)],
        before: [final(5, 'A', contentDetails1Final)],
        after: [update(final(5, 'A', contentDetails1Final))],
      },
      {
        name: 'Updating a published record',
        fcrs: [fcr('A', contentDetails3)],
        before: [final(5, 'A', contentDetails1Final)],
        after: [update(final(5, 'A', contentDetails3Final))],
      },
      {
        name: 'Undoing a redirect for a missing record',
        fcrs: [],
        before: [redir(5, 'A', 46)],
        after: [update(assign(5, 'A'))],
      },
      {
        name: 'Keeping assignments untouched',
        fcrs: [],
        before: [assign(5, 'A')],
        after: [update(assign(5, 'A'))],
      },
    ]);
  });

  describe('Simple replacement', () => {
    runTestCases([
      /** Published → not published */
      {
        name: 'Unpublishing an approved record replaced with a missing one',
        fcrs: [fcr('A', contentDetails1, repl('B'))],
        before: [final(5, 'A', contentDetails1Final)],
        after: [update(assign(5, 'A'))],
      },
      {
        name: 'Unpublishing an approved record replaced with an unapproved one',
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B')],
        before: [final(5, 'A', contentDetails1Final)],
        after: [update(assign(5, 'A'))],
      },
      {
        name: 'Unpublishing an unapproved record replaced with an unapproved one',
        fcrs: [fcr('A', undefined, repl('B')), fcr('B')],
        before: [final(5, 'A', contentDetails1Final)],
        after: [update(assign(5, 'A'))],
      },
      {
        name: 'Replacing an approved record with another approved one',
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B', contentDetails2)],
        before: [final(5, 'A', contentDetails1Final)],
        after: [update(final(5, 'A', contentDetails2Final), 'B')],
      },
      {
        name: 'Replacing an unapproved record with an approved one',
        fcrs: [fcr('A', undefined, repl('B')), fcr('B', contentDetails2)],
        before: [final(5, 'A', contentDetails1Final)],
        after: [update(final(5, 'A', contentDetails2Final), 'B')],
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
        after: [create(final(1, 'B', contentDetails2Final))],
      },
      {
        name: 'Publishing an approved record replacing an unapproved one',
        fcrs: [fcr('A', undefined, repl('B')), fcr('B', contentDetails2)],
        before: [],
        after: [create(final(1, 'B', contentDetails2Final))],
      },
    ]);
  });

  describe('Complex replacements', () => {
    runTestCases([
      {
        name: 'Chain replacement',
        fcrs: [
          fcr('A', contentDetails1, repl('B')),
          fcr('B', contentDetails2, repl('C')),
          fcr('C', contentDetails3),
        ],
        before: [final(5, 'A', contentDetails1Final)],
        after: [update(final(5, 'A', contentDetails3Final), 'C')],
      },
      {
        name: 'Chain replacement of an unpublished record',
        fcrs: [
          fcr('A', contentDetails1, repl('B')),
          fcr('B', contentDetails2, repl('C')),
          fcr('C', contentDetails3),
        ],
        before: [],
        after: [create(final(1, 'C', contentDetails3Final))],
      },
      {
        name: 'Chain replacement of an unpublished record through a published one',
        fcrs: [
          fcr('A', contentDetails1, repl('B')),
          fcr('B', contentDetails2, repl('C')),
          fcr('C', contentDetails3),
        ],
        before: [final(89, 'B', contentDetails2Final)],
        after: [update(final(89, 'B', contentDetails3Final), 'C')],
      },
      {
        name: 'Chain replacement with a missing record',
        fcrs: [
          fcr('A', contentDetails1, repl('B')),
          fcr('B', contentDetails2, repl('C')),
        ],
        before: [final(5, 'A', contentDetails1Final)],
        after: [update(assign(5, 'A'))],
      },
      {
        name: 'Merger',
        fcrs: [
          fcr('A', contentDetails1, repl('C')),
          fcr('B', contentDetails2, repl('C')),
          fcr('C', contentDetails3),
        ],
        before: [
          final(5, 'A', contentDetails1Final),
          final(89, 'B', contentDetails2Final),
        ],
        after: [
          update(final(5, 'A', contentDetails3Final), 'C'),
          update(redir(89, 'B', 5)),
        ],
      },
      {
        name: 'Merger into a missing record',
        fcrs: [
          fcr('A', contentDetails1, repl('C')),
          fcr('B', contentDetails2, repl('C')),
        ],
        before: [
          final(5, 'A', contentDetails1Final),
          final(89, 'B', contentDetails2Final),
        ],
        after: [update(assign(5, 'A')), update(assign(89, 'B'))],
      },
      {
        name: 'Redirect to the forward record',
        fcrs: [fcr('A', contentDetails1, repl('B')), fcr('B', contentDetails2)],
        before: [
          final(5, 'A', contentDetails1Final),
          final(89, 'B', contentDetails2Final),
        ],
        after: [
          update(redir(5, 'A', 89)),
          update(final(89, 'B', contentDetails2Final)),
        ],
      },
      {
        name: 'Redirect to the past record',
        fcrs: [fcr('A', contentDetails1), fcr('B', contentDetails2, repl('A'))],
        before: [
          final(5, 'A', contentDetails1Final),
          final(89, 'B', contentDetails2Final),
        ],
        after: [
          update(final(5, 'A', contentDetails1Final)),
          update(redir(89, 'B', 5)),
        ],
      },
      {
        name: 'Redirect to a missing published record',
        fcrs: [fcr('B', contentDetails2, repl('A'))],
        before: [
          final(5, 'A', contentDetails1Final),
          final(89, 'B', contentDetails2Final),
        ],
        after: [update(assign(5, 'A')), update(assign(89, 'B'))],
      },
    ]);
  });

  /**
   * This set assumes that there was a replacement that was published
   */
  describe('Restoration', () => {
    runTestCases([
      {
        name: 'Removing a replacement altogether',
        fcrs: [fcr('A', contentDetails1)],
        before: [final(5, 'A', contentDetails2Final)],
        after: [update(final(5, 'A', contentDetails1Final))],
      },
      {
        name: 'Publishing a replacement separately',
        fcrs: [fcr('A', contentDetails1), fcr('B', contentDetails2)],
        before: [final(5, 'A', contentDetails2Final)],
        after: [
          update(final(5, 'A', contentDetails1Final)),
          create(final(1, 'B', contentDetails2Final)),
        ],
      },
      {
        name: 'Removing a redirection',
        fcrs: [fcr('A', contentDetails1), fcr('B', contentDetails2)],
        before: [redir(5, 'A', 89), final(89, 'B', contentDetails2Final)],
        after: [
          update(final(5, 'A', contentDetails1Final)),
          update(final(89, 'B', contentDetails2Final)),
        ],
      },
    ]);
  });

  describe('Invalid cases', () => {
    const runTestCases = (
      cases: {
        name: string;
        fcrs: [string, FidelityCheckRecord][];
        before: FinalRecord[];
      }[],
      errorRegexp: RegExp
    ) =>
      cases.forEach(({ name, fcrs, before }) =>
        test(`${name}`, () =>
          expect(() => [...createFinalRecords(new Map(fcrs), before)]).toThrow(
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
            before: [assign(5, 'A')],
          },
          {
            name: 'Two records',
            fcrs: [
              fcr('A', undefined, repl('B')),
              fcr('B', undefined, repl('A')),
            ],
            before: [assign(5, 'A')],
          },
          {
            name: 'Self',
            fcrs: [fcr('A', undefined, repl('A'))],
            before: [assign(5, 'A')],
          },
        ],
        /circular/i
      );
    });
  });
});
