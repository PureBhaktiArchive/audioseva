import { ContentDetails, FinalContentDetails } from '../ContentDetails';
import { DateTimeConverter } from '../DateTimeConverter';
import { FidelityCheckRecord } from '../FidelityCheck/FidelityCheckRecord';
import { StorageFileReference } from '../StorageFileReference';
import { FinalRecord } from './FinalRecord';
import { createIdGenerator } from './id-generator';
import { sanitizeTopics } from './sanitizer';

export interface FinalizationResult {
  record: FinalRecord;
  isNew: boolean;
  file: StorageFileReference;
}

const unknownToNull = (input: string): string =>
  input?.toUpperCase() === 'UNKNOWN' ? null : input;

const sanitizeContentDetails = (
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

export const emptyContentDetails: FinalContentDetails = {
  title: null,
  category: null,
  date: null,
  dateUncertain: null,
  languages: null,
  location: null,
  locationUncertain: null,
  percentage: null,
  soundQualityRating: null,
  timeOfDay: null,
  topics: null,
  otherSpeakers: null,
};

/**
 * Creates new set of final records based on the previous version and new records from FC
 * Using arrays as input parameters since `Iterator.map` is not supported in Node yet: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator/map
 */
export const createFinalRecords = function* (
  fidelityRecords: Map<string, FidelityCheckRecord>,
  finalRecords: FinalRecord[]
): Generator<FinalizationResult, void, undefined> {
  /**
   * Finds a fidelity record for a given task ID. Resolves the replacement chain.
   * @param taskId
   * @returns `taskId` along with the record itself. `null` instead of the record if it's not found.
   */
  const resolveFidelityRecord = (
    taskId: string
  ): [string, FidelityCheckRecord] => {
    const pastIds = new Set<string>();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const record = fidelityRecords.get(taskId);
      if (!record) return [taskId, null];
      if (!record.replacement) return [taskId, record];
      pastIds.add(taskId);
      taskId = record.replacement.taskId;
      if (pastIds.has(taskId)) throw `Circular replacement at ${taskId}`;
    }
  };

  // We need to know all the published task IDs in order to detect redirects properly
  const publishedTasks = new Map(
    finalRecords.flatMap((record) =>
      record.redirectTo || !record.sourceFileId
        ? []
        : [[record.sourceFileId, record.id]]
    )
  );

  // Updating existing (previously finalized) records
  for (const record of finalRecords) {
    // Skipping records without a task ID
    if (!record.sourceFileId) return;

    const [taskId, fidelityRecord] = resolveFidelityRecord(record.sourceFileId);

    yield {
      file: fidelityRecord.file,
      isNew: false,
      record: {
        id: record.id,
        sourceFileId: record.sourceFileId,

        ...(fidelityRecord &&
        'approval' in fidelityRecord &&
        fidelityRecord.approval
          ? // Generating a redirect record if the target task has been already published under another file ID
            publishedTasks.has(taskId) &&
            publishedTasks.get(taskId) !== record.id
            ? {
                redirectTo: publishedTasks.get(taskId),
                approvalDate: null,
                ...emptyContentDetails,
              }
            : // Normal record
              // Saving again because the task ID could have changed due to replacements
              (publishedTasks.set(taskId, record.id),
              {
                ...sanitizeContentDetails(fidelityRecord.contentDetails),
                approvalDate: new Date(
                  fidelityRecord.approval.timestamp
                ).toISOString(),
                redirectTo: null,
              })
          : // Unpublishing, but keeping the original fileId association
            null),
      },
    };
  }

  const existingFileIds = new Set(finalRecords.map(({ id }) => id));
  const fileIdGenerator = createIdGenerator((id) => existingFileIds.has(id));

  // Generating new final records
  for (const [taskId, fidelityRecord] of fidelityRecords) {
    if (
      'approval' in fidelityRecord &&
      fidelityRecord.approval &&
      !fidelityRecord.replacement &&
      !publishedTasks.has(taskId)
    )
      yield {
        isNew: true,
        file: fidelityRecord.file,
        record: {
          id: fileIdGenerator.next().value,
          sourceFileId: taskId,
          approvalDate: new Date(
            fidelityRecord.approval.timestamp
          ).toISOString(),
          ...sanitizeContentDetails(fidelityRecord.contentDetails),
          redirectTo: null,
        },
      };
  }
};
