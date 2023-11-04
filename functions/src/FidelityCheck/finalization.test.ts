/*!
 * sri sri guru gauranga jayatah
 */

import { DateTime } from 'luxon';
import { StorageFileReference } from '../StorageFileReference';
import { ContentDetails } from './ContentDetails';
import { FidelityCheck, FidelityCheckRecord } from './FidelityCheckRecord';
import { createFinalRecords, tuple } from './finalization';

describe('Finalization', () => {
  const contentDetailsFC1: ContentDetails = {
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

  const contentDetailsFC2 = {
    ...contentDetailsFC1,
    title: 'ANOTHER',
  };

  const contentDetailsFinal1 = {
    ...contentDetailsFC1,
    date: '1998-08-30',
  };

  const contentDetailsFinal2 = {
    ...contentDetailsFinal1,
    title: 'ANOTHER',
  };

  const file1: StorageFileReference = {
    name: 'SOME.flac',
    bucket: 'final',
    generation: 1234567,
  };

  const file2: StorageFileReference = {
    ...file1,
    name: 'ANOTHER.flac',
  };

  const fidelityCheck: FidelityCheck = {
    author: 'someone',
    timestamp: 123,
  };

  const approval = { timestamp: DateTime.now().valueOf() };

  function* generateFidelityRecords(
    taskId: string,
    approved: boolean,
    replacementTaskId: string
  ): Generator<[string, FidelityCheckRecord], void, unknown> {
    const replacement = {
      replacement: replacementTaskId
        ? {
            taskId: replacementTaskId,
            timestamp: DateTime.now().valueOf(),
          }
        : undefined,
    };

    yield [
      taskId,
      approved
        ? {
            approval,
            contentDetails: contentDetailsFC1,
            file: file1,
            fidelityCheck,
            ...replacement,
          }
        : { file: file1, fidelityCheck, ...replacement },
    ];
    if (replacementTaskId)
      yield [
        replacementTaskId,
        {
          approval,
          contentDetails: contentDetailsFC2,
          file: file2,
          fidelityCheck,
        },
      ];
  }

  // Replacement task is supposed to be approved in this test case
  test.each`
    taskId        | approved | replacementTaskId | existingAssignments  | expectedAssignments
    ${'SOME-1-1'} | ${false} | ${undefined}      | ${[]}                | ${[]}
    ${'SOME-1-2'} | ${false} | ${'ANOTHER-1-2'}  | ${[]}                | ${[[1, 'ANOTHER-1-2']]}
    ${'SOME-1-3'} | ${false} | ${undefined}      | ${[[5, 'SOME-1-3']]} | ${[]}
    ${'SOME-1-4'} | ${false} | ${'ANOTHER-1-4'}  | ${[[5, 'SOME-1-4']]} | ${[[5, 'ANOTHER-1-4']]}
    ${'SOME-2-1'} | ${true}  | ${undefined}      | ${[]}                | ${[[1, 'SOME-2-1']]}
    ${'SOME-2-2'} | ${true}  | ${'ANOTHER-2-2'}  | ${[]}                | ${[[1, 'ANOTHER-2-2']]}
    ${'SOME-2-3'} | ${true}  | ${undefined}      | ${[[5, 'SOME-2-3']]} | ${[[5, 'SOME-2-3']]}
    ${'SOME-2-4'} | ${true}  | ${'ANOTHER-2-4'}  | ${[[5, 'SOME-2-4']]} | ${[[5, 'ANOTHER-2-4']]}
  `(
    '$taskId',
    ({
      taskId,
      approved,
      replacementTaskId,
      existingAssignments,
      expectedAssignments,
    }: {
      taskId: string;
      approved: boolean;
      replacementTaskId: string;
      existingAssignments: [number, string][];
      expectedAssignments: [number, string][];
    }) => {
      const existingFinalRecords = (existingAssignments || []).map(
        ([fileId, taskId]) =>
          tuple([
            fileId,
            { taskId, file: file1, contentDetails: contentDetailsFC1 },
          ])
      );

      const expectedFinalRecords = (expectedAssignments || []).map(
        ([fileId, taskId]) => [
          fileId,
          {
            taskId,
            file: replacementTaskId ? file2 : file1,
            contentDetails: replacementTaskId
              ? contentDetailsFinal2
              : contentDetailsFinal1,
          },
        ]
      );

      expect([
        ...createFinalRecords(
          [...generateFidelityRecords(taskId, approved, replacementTaskId)],
          existingFinalRecords
        ),
      ]).toStrictEqual(expectedFinalRecords);
    }
  );
});
