/*!
 * sri sri guru gauranga jayatah
 */

import { DateTime } from 'luxon';
import { getIdAssignments } from './id-assignment';
import { createIdGenerator } from './id-generator';

describe('ID assignment', () => {
  test.each`
    taskId        | approved | fileId       | replacementTaskId | assignments
    ${'SOME-1-1'} | ${false} | ${undefined} | ${undefined}      | ${[]}
    ${'SOME-1-2'} | ${false} | ${undefined} | ${'ANOTHER-1-2'}  | ${[]}
    ${'SOME-1-3'} | ${false} | ${1111}      | ${undefined}      | ${[]}
    ${'SOME-1-4'} | ${false} | ${1111}      | ${'ANOTHER-1-4'}  | ${[[1111, 'ANOTHER-1-4']]}
    ${'SOME-2-1'} | ${true}  | ${undefined} | ${undefined}      | ${[[1, 'SOME-2-1']]}
    ${'SOME-2-2'} | ${true}  | ${undefined} | ${'ANOTHER-2-2'}  | ${[]}
    ${'SOME-2-3'} | ${true}  | ${1111}      | ${undefined}      | ${[]}
    ${'SOME-2-4'} | ${true}  | ${1111}      | ${'ANOTHER-2-4'}  | ${[[1111, 'ANOTHER-2-4']]}
    ${'SAME-1-1'} | ${true}  | ${1111}      | ${'SAME-1-1'}     | ${[]}
  `(
    '$taskId',
    ({ taskId, approved, fileId, replacementTaskId, assignments }) => {
      expect(
        getIdAssignments(
          taskId,
          {
            approval: approved
              ? { timestamp: DateTime.now().valueOf() }
              : undefined,
            replacement: replacementTaskId
              ? {
                  taskId: replacementTaskId,
                  timestamp: DateTime.now().valueOf(),
                }
              : undefined,
          },
          fileId,
          createIdGenerator((id) => id === fileId)
        )
      ).toStrictEqual(assignments);
    }
  );
});
