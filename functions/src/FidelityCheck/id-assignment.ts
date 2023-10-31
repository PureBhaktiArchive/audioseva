import { FidelityCheckRecord } from './FidelityCheckRecord';
import { createIdGenerator } from './id-generator';

export const getIdAssignments = (
  taskId: string,
  { replacement, approval }: FidelityCheckRecord,
  currentFileId: number,
  idGenerator: ReturnType<typeof createIdGenerator>
): [number, string][] =>
  replacement && currentFileId && replacement.taskId !== taskId
    ? // Assigning the current File ID to the replacement Task ID
      [[currentFileId, replacement.taskId]]
    : // Assigning a new file ID to approved records without ID
    approval && !currentFileId && !replacement
    ? [[idGenerator.next().value, taskId]]
    : [];
