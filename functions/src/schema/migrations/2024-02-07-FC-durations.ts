import { getDatabase } from 'firebase-admin/database';
import { filter, map, pipe } from 'iter-ops';
import { FidelityCheckRecord } from '../../FidelityCheck/FidelityCheckRecord';
import { objectToIterableEntries } from '../../iterable-helpers';
import {
  getFileDurationPath,
  getMetadataCacheRef,
} from '../../metadata-database';

export const fillFidelityCheckDurations = async () => {
  const fidelityRef = getDatabase().ref('/FC/records');
  const [recordsSnapshot, metadataCacheSnapshot] = await Promise.all([
    fidelityRef.once('value'),
    getMetadataCacheRef().once('value'),
  ]);

  await fidelityRef.update(
    Object.fromEntries(
      pipe(
        objectToIterableEntries(
          recordsSnapshot.val() as Record<string, FidelityCheckRecord>
        ),
        filter(([, record]) => !!record.file && !record.duration),
        map(([taskId, record]) => [
          `${taskId}/duration`,
          metadataCacheSnapshot
            .child(getFileDurationPath(record.file))
            .val() as number,
        ])
      )
    )
  );
};
