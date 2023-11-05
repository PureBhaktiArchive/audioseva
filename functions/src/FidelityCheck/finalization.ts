import { DateTimeConverter } from '../DateTimeConverter';
import { ContentDetails } from './ContentDetails';
import { FidelityCheckRecord } from './FidelityCheckRecord';
import { FinalRecord } from './FinalRecord';
import { createIdGenerator } from './id-generator';

const coalesceUnknown = (input: string): string | null =>
  input?.toUpperCase() === 'UNKNOWN' ? null : input;

const createContentDetails = (contentDetails: ContentDetails) => ({
  ...contentDetails,
  date: DateTimeConverter.standardizePseudoIsoDate(
    coalesceUnknown(contentDetails.date)
  ),
  dateUncertain: coalesceUnknown(contentDetails.date)
    ? contentDetails.dateUncertain
    : null,
  location: coalesceUnknown(contentDetails.location),
  locationUncertain: coalesceUnknown(contentDetails.location)
    ? contentDetails.locationUncertain
    : null,
});

/**
 * Creates new set of final records based on the previous version and new records from FC
 * Using arrays as input parameters since `Iterator.map` is not supported in Node yet: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator/map
 */
export const createFinalRecords = function* (
  fidelityRecords: [string, FidelityCheckRecord][],
  finalRecords: [number, FinalRecord][]
): Generator<[number, FinalRecord], void, undefined> {
  const fidelityRecordsMap = new Map(fidelityRecords);

  /**
   * Finds an ultimate replacement record for a given record.
   * Also, keeps record of all the existing
   * @param taskId
   * @returns `taskId` along with the record itself
   */
  const resolveReplacementChain = (
    taskId: string
  ): [string, FidelityCheckRecord] => {
    let pastIds: Set<string>;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const record = fidelityRecordsMap.get(taskId);
      if (!record.replacement) return [taskId, record];
      (pastIds ??= new Set()).add(taskId);
      taskId = record.replacement.taskId;
      if (pastIds.has(taskId)) throw `Circular replacement at ${taskId}`;
    }
  };

  const publishedTaskIds = new Set<string>();
  const existingFileIds = new Set<number>();
  const fileIdGenerator = createIdGenerator((id) => existingFileIds.has(id));

  const generateFinalRecords = (
    taskId: string,
    record: FidelityCheckRecord,
    fileId: number | Iterator<number>
  ): [number, FinalRecord][] =>
    'approval' in record && // Narrowing https://www.typescriptlang.org/docs/handbook/2/narrowing.html#the-in-operator-narrowing
    record.approval
      ? [
          [
            typeof fileId === 'number' ? fileId : fileId.next().value,
            {
              taskId,
              file: record.file,
              contentDetails: createContentDetails(record.contentDetails),
            },
          ],
        ]
      : typeof fileId === 'number'
      ? // Unpublishing, but keeping the fileId→taskId association
        [[fileId, { taskId, file: record.file }]]
      : [];

  // Updating existing (previously finalized) records
  yield* finalRecords
    // Using flatMap to remove items when necessary.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap#for_adding_and_removing_items_during_a_map
    // We have to type the return value explicitly to avoid an issue caused by alternate types NormalRecord and RedirectRecord
    .flatMap(([fileId, record]): [number, FinalRecord][] => {
      existingFileIds.add(fileId);
      if ('taskId' in record) {
        const [taskId, fidelityRecord] = resolveReplacementChain(record.taskId);
        publishedTaskIds.add(taskId);
        return generateFinalRecords(taskId, fidelityRecord, fileId);
      } else return [[fileId, record]];
    });

  // Generating new final records
  yield* fidelityRecords
    // Using flatMap to remove items when necessary.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap#for_adding_and_removing_items_during_a_map
    .flatMap(([taskId, record]) =>
      // Ignoring already published and replaced records
      publishedTaskIds.has(taskId) || record.replacement
        ? []
        : generateFinalRecords(taskId, record, fileIdGenerator)
    );
};
