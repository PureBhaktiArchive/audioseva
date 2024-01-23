import { ContentDetails, FinalContentDetails } from '../ContentDetails';
import { DateTimeConverter } from '../DateTimeConverter';
import { FidelityCheckRecord } from '../FidelityCheck/FidelityCheckRecord';
import { FinalRecord } from './FinalRecord';
import { createIdGenerator } from './id-generator';
import { sanitizeTopics } from './sanitizer';

const unknownToNull = (input: string): string =>
  input?.toUpperCase() === 'UNKNOWN' ? null : input;

export const sanitizeContentDetails = (
  contentDetails: ContentDetails
): FinalContentDetails => ({
  // Listing all properties explicitly to avoid leakage of unexpected other properties.
  title: contentDetails.title,
  topics: sanitizeTopics(contentDetails.topics),
  date: DateTimeConverter.standardizePseudoIsoDate(
    unknownToNull(contentDetails.date)
  ),
  dateUncertain: unknownToNull(contentDetails.date)
    ? contentDetails.dateUncertain
    : null,
  timeOfDay: contentDetails.timeOfDay || null,
  location: unknownToNull(contentDetails.location),
  locationUncertain: unknownToNull(contentDetails.location)
    ? contentDetails.locationUncertain
    : null,
  category: contentDetails.category,
  languages: contentDetails.languages.split(',').map((value) => value.trim()),
  percentage: contentDetails.percentage,
  otherSpeakers:
    contentDetails.otherSpeakers?.split('&')?.map((value) => value.trim()) ||
    null,
  soundQualityRating: contentDetails.soundQualityRating,
});

/**
 * Finds a fidelity record for a given task ID. Resolves the replacement chain.
 * @param taskId
 * @returns `taskId` along with the record itself. `null` instead of the record if it's not found.
 */
export const resolveFidelityRecord = (
  fidelityRecords: Map<string, FidelityCheckRecord>,
  taskId: string
): { taskId: string; fidelityRecord: FidelityCheckRecord } => {
  const pastIds = new Set<string>();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const record = fidelityRecords.get(taskId);
    if (!record?.replacement) return { taskId, fidelityRecord: record };
    pastIds.add(taskId);
    taskId = record.replacement.taskId;
    if (pastIds.has(taskId)) throw `Circular replacement at ${taskId}`;
  }
};

/**
 * Creates new set of final records based on the previous version and new records from FC
 * Using arrays as input parameters since `Iterator.map` is not supported in Node yet: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator/map
 */
export const createFinalRecords = function* (
  fidelityRecords: Map<string, FidelityCheckRecord>,
  finalRecords: FinalRecord[]
): IterableIterator<FinalRecord> {
  // We need to know all the published task IDs in order to detect redirects properly
  const publishedTasks = new Map(
    finalRecords.flatMap((record) =>
      'redirectTo' in record || !record.taskId
        ? []
        : [[record.taskId, record.id]]
    )
  );

  // Updating existing (previously finalized) records
  yield* finalRecords.map((record): FinalRecord => {
    // Returning a record without a task ID as it is
    if (!record.taskId) return record;

    const { taskId, fidelityRecord } = resolveFidelityRecord(
      fidelityRecords,
      record.taskId
    );

    return fidelityRecord &&
      'approval' in fidelityRecord &&
      fidelityRecord.approval
      ? // Generating a redirect record if the target task has been already published under another file ID
        publishedTasks.has(taskId) && publishedTasks.get(taskId) !== record.id
        ? {
            id: record.id,
            taskId: record.taskId,
            redirectTo: publishedTasks.get(taskId),
          }
        : // Normal record
          // Saving again because the task ID could have changed due to replacements
          (publishedTasks.set(taskId, record.id),
          {
            id: record.id,
            taskId: record.taskId,
            file: fidelityRecord.file,
            contentDetails: sanitizeContentDetails(
              fidelityRecord.contentDetails
            ),
          })
      : // Unpublishing, but keeping the original fileId association
        {
          id: record.id,
          taskId: record.taskId,
        };
  });

  const existingFileIds = new Set(finalRecords.map(({ id }) => id));
  const fileIdGenerator = createIdGenerator((id) => existingFileIds.has(id));

  // Generating new final records
  for (const [taskId, fidelityRecord] of fidelityRecords) {
    // Skipping unapproved, already published or replaced records
    if (
      'approval' in fidelityRecord &&
      fidelityRecord.approval &&
      !fidelityRecord.replacement &&
      !publishedTasks.has(taskId)
    )
      yield {
        id: fileIdGenerator.next().value,
        taskId,
        file: fidelityRecord.file,
        contentDetails: sanitizeContentDetails(fidelityRecord.contentDetails),
      };
  }
};
