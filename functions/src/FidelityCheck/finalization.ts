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
    const pastIds = new Set<string>();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const record = fidelityRecordsMap.get(taskId);
      if (!record) return [taskId, null];
      if (!record.replacement) return [taskId, record];
      pastIds.add(taskId);
      taskId = record.replacement.taskId;
      if (pastIds.has(taskId)) throw `Circular replacement at ${taskId}`;
    }
  };

  // We need to know all the published task IDs in order to detect redirects properly
  const publishedTasks = new Map(
    finalRecords.flatMap(([fileId, record]) =>
      'redirectTo' in record ? [] : [[record.taskId, fileId]]
    )
  );
  const existingFileIds = new Set<number>();
  const fileIdGenerator = createIdGenerator((id) => existingFileIds.has(id));

  // Updating existing (previously finalized) records
  yield* finalRecords
    // Using flatMap to remove items when necessary.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap#for_adding_and_removing_items_during_a_map
    // We have to type the return value explicitly to avoid an issue caused by alternate types NormalRecord and RedirectRecord
    .flatMap<[number, FinalRecord]>(([fileId, record]) => {
      existingFileIds.add(fileId);

      // Keeping redirect records as is
      if ('redirectTo' in record) return [[fileId, record]];

      const [taskId, fidelityRecord] = resolveReplacementChain(record.taskId);

      // Generating a redirect record if the target task has been already published under another file ID
      if (publishedTasks.has(taskId) && publishedTasks.get(taskId) !== fileId)
        return [[fileId, { redirectTo: publishedTasks.get(taskId) }]];

      // Saving again because the task ID could change due to replacements
      publishedTasks.set(taskId, fileId);

      return [
        [
          fileId,
          fidelityRecord && 'approval' in fidelityRecord
            ? // Normal record
              {
                taskId,
                file: fidelityRecord.file,
                contentDetails: createContentDetails(
                  fidelityRecord.contentDetails
                ),
              }
            : // Unpublishing, but keeping the fileId association
              { taskId },
        ],
      ];
    });

  // Generating new final records
  yield* fidelityRecords
    // Using flatMap to remove items when necessary.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap#for_adding_and_removing_items_during_a_map
    .flatMap<[number, FinalRecord]>(([taskId, fidelityRecord]) =>
      // Ignoring already published and replaced records
      publishedTasks.has(taskId) ||
      fidelityRecord.replacement ||
      !('approval' in fidelityRecord)
        ? []
        : [
            [
              fileIdGenerator.next().value,
              {
                taskId,
                file: fidelityRecord.file,
                contentDetails: createContentDetails(
                  fidelityRecord.contentDetails
                ),
              },
            ],
          ]
    );
};
