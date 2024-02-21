import { filter, map, pipeSync } from 'iter-ops';
import { DateTimeConverter } from '../DateTimeConverter';
import {
  ApprovedRecord,
  FidelityCheckRecord,
} from '../FidelityCheck/FidelityCheckRecord';
import { ActiveRecord, AudioRecord } from './AudioRecord';
import { createIdGenerator } from './id-generator';
import { sanitizeTopics } from './sanitizer';

const unknownToNull = (input: string): string =>
  input?.toUpperCase() === 'UNKNOWN' ? null : input;

const createActiveRecord = (
  id: number,
  taskId: string,
  { contentDetails, duration, approval }: ApprovedRecord
): ActiveRecord => ({
  id,
  status: 'active',
  sourceFileId: taskId,
  approvalDate: new Date(approval.timestamp).toISOString(),
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
  duration: duration ? Math.round(duration) : null,
});

/**
 * Creates a new set of audio records based on the previous version and records from FC
 */
export const finalizeAudios = function* (
  fidelityRecords: Map<string, FidelityCheckRecord>,
  audioRecords: AudioRecord[]
): IterableIterator<AudioRecord> {
  /**
   * Finds a fidelity record for a given task ID. Resolves the replacement chain.
   * @param taskId
   * @returns `taskId` along with the record itself. `null` instead of the record if it's not found.
   */
  const resolveFidelityRecord = (
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

  // We need to keep track of all the published task IDs in order to detect redirects properly
  const publishedTasks = new Map(
    pipeSync(
      audioRecords,
      filter((record) => record.status === 'active' && !!record.sourceFileId),
      map((record) => [record.sourceFileId, record.id])
    )
  );

  // Updating existing (previously finalized) records
  yield* pipeSync(
    audioRecords,
    // Keeping records without a task ID intact because they may have been created not by this code
    filter((record) => !!record.sourceFileId),
    map(({ id, sourceFileId }): AudioRecord => {
      const { taskId, fidelityRecord } = resolveFidelityRecord(sourceFileId);

      return fidelityRecord &&
        'approval' in fidelityRecord &&
        fidelityRecord.approval
        ? publishedTasks.has(taskId) && publishedTasks.get(taskId) !== id
          ? // A redirect record if the target task has been already published under another file ID
            {
              id,
              status: 'redirect',
              // Keeping the source file ID in case a replacement is removed later
              sourceFileId,
              redirectTo: publishedTasks.get(taskId),
            }
          : // Active record
            (publishedTasks.set(taskId, id),
            createActiveRecord(id, taskId, fidelityRecord))
        : // Deactivating, but keeping the original source file ID in order to publish the same record under the same ID
          { id, sourceFileId, status: 'inactive' };
    })
  );

  const existingFileIds = new Set(
    pipeSync(
      audioRecords,
      map(({ id }) => id)
    )
  );
  const fileIdGenerator = createIdGenerator((id) => existingFileIds.has(id));

  // Generating new final records
  yield* pipeSync(
    fidelityRecords,
    // Skipping unapproved, already published or replaced records
    filter(
      ([taskId, fidelityRecord]) =>
        'approval' in fidelityRecord &&
        fidelityRecord.approval &&
        !fidelityRecord.replacement &&
        !publishedTasks.has(taskId)
    ),
    map(([taskId, fidelityRecord]) =>
      createActiveRecord(
        fileIdGenerator.next().value,
        taskId,
        fidelityRecord as ApprovedRecord //We asserted this above, TypeScript is not smart enough
      )
    )
  );
};
