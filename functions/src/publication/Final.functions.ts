/*!
 * sri sri guru gauranga jayatah
 */

import { createItem, readItems, updateItem } from '@directus/sdk';
import contentDisposition from 'content-disposition';
import { getDatabase } from 'firebase-admin/database';
import { getFunctions } from 'firebase-admin/functions';
import { getStorage } from 'firebase-admin/storage';
import * as functions from 'firebase-functions';
import { drain, map, pipeAsync, pipeSync, waitRace } from 'iter-ops';
import { finished } from 'node:stream/promises';
import * as path from 'path';
import * as util from 'util';
import { FidelityCheckRecord } from '../FidelityCheck/FidelityCheckRecord';
import { StorageFileReference } from '../StorageFileReference';
import { StorageManager } from '../StorageManager';
import { objectToIterableEntries } from '../iterable-helpers';
import { getDifference } from '../object-diff';
import { ActiveRecord, AudioRecord } from './AudioRecord';
import { directus } from './directus';
import { finalizeAudios } from './finalization';
import { composeFileName, composeMediaMetadata } from './metadata';
import {
  addMediaMetadata,
  convertToMp3,
  copyMP3,
  transcode,
} from './transcode';

const mp3Queue = getFunctions().taskQueue<MP3CreationTask>('Final-createMP3');

const getPublicFile = (id: number) =>
  getStorage()
    .bucket(functions.config().final?.public?.bucket)
    .file(`${id}.mp3`);

const composeStorageMetadata = (fileName: string, md5Hash: string) => ({
  contentType: 'audio/mpeg',
  contentDisposition: contentDisposition(fileName),
  metadata: {
    sourceMd5Hash: md5Hash,
  },
});

/**
 * Copies an approved file into the `final` bucket
 * and enqueues a public MP3 file creation task if necessary.
 *
 * Original audio record is used to detect changes in the content details.
 * Therefore, it is assumed that the latest MP3 file corresponds
 * to the latest (original) record.
 *
 * @param file
 * @param record
 * @param original
 */
const finalizeFile = async (
  file: StorageFileReference,
  record: ActiveRecord,
  original: AudioRecord
) => {
  const sourceFile = getStorage().bucket(file.bucket).file(file.name, {
    generation: file.generation,
  });
  const finalFile = StorageManager.getBucket('final').file(
    `${record.id}${path.extname(file.name)}`
  );
  const publicFile = getPublicFile(record.id);

  // This will populate files’ `metadata` property.
  await Promise.all([
    sourceFile.exists(),
    finalFile.exists(),
    publicFile.exists(),
  ]);

  // This way we check for file existence to avoid second request with `exists()` method
  if (!sourceFile.metadata.name)
    return functions.logger.warn(
      'Source file',
      sourceFile.bucket.name,
      sourceFile.id,
      'does not exist.'
    );

  if (finalFile.metadata.md5Hash !== sourceFile.metadata.md5Hash) {
    console.debug('Copying file', sourceFile.metadata.id, 'to', finalFile.name);
    await sourceFile.copy(finalFile, {
      contentType: sourceFile.metadata.contentType,
      // This property seems to be incorrectly typed, see https://github.com/googleapis/nodejs-storage/issues/2389
      // In fact it is treated as the custom metadata only
      metadata: {
        // Keeping the source file metadata to preserve the `mtime`
        ...sourceFile.metadata.metadata,
        source: sourceFile.metadata.id,
      },
    });
  } else console.debug('Final file', finalFile.name, 'is up to date');

  const mediaMetadata = composeMediaMetadata(record);
  const fileName = composeFileName(record);

  /*
   * Performing least operation possible
   * depending on what has changed in the record
   */

  // Transcoding from source if MP3 does not exist or the source file changed
  if (
    !publicFile.metadata.name ||
    +publicFile.metadata.size === 0 ||
    publicFile.metadata.metadata?.sourceMd5Hash !== sourceFile.metadata.md5Hash
  ) {
    console.debug('Creating public file', publicFile.name);

    mp3Queue.enqueue({
      source: {
        bucket: finalFile.bucket.name,
        name: finalFile.name,
      },
      destination: {
        bucket: publicFile.bucket.name,
        name: publicFile.name,
      },
      fileName,
      mediaMetadata,
    });
  }

  // Updating media metadata if it changed
  else if (
    original?.status !== 'active' ||
    !util.isDeepStrictEqual(composeMediaMetadata(original), mediaMetadata)
  ) {
    console.debug('Updating media metadata for public file', publicFile.name);
    mp3Queue.enqueue({
      source: {
        bucket: publicFile.bucket.name,
        name: publicFile.name,
      },
      destination: {
        bucket: publicFile.bucket.name,
        name: publicFile.name,
      },
      fileName,
      mediaMetadata,
    });
  }

  // Updating only storage metadata if it changed
  else if (composeFileName(original as ActiveRecord) !== fileName) {
    console.debug('Updating storage metadata for public file', publicFile.name);
    await publicFile.setMetadata(
      composeStorageMetadata(fileName, sourceFile.metadata.md5Hash)
    );
  }

  // Otherwise doing nothing
  else console.debug('Public file', publicFile.name, 'is up to date');
};

const deletePublicFile = async (id: number) => {
  const file = getPublicFile(id);
  const [exists] = await file.exists();
  if (exists) {
    console.debug('Deleting public file', file.name);
    await file.delete();
  }
};

/**
 * This cloud function publishes fidelity-checked records
 * from the Realtime Database into the Directus CMS
 * and finalizes the corresponding file ({@link finalizeFile}).
 *
 * This HTTP function is made private, which means that all requests
 * should be authenticated. See {@link https://cloud.google.com/functions/docs/securing/authenticating}.
 */
export const publish = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB',
    maxInstances: 1,
    invoker: (functions.config().final.publication.invokers as string)
      .split(',')
      .map((x) => x.trim()),
  })
  .https.onRequest(async () => {
    const [fidelitySnapshot, audioRecords] = await Promise.all([
      getDatabase().ref('/FC/records').once('value'),
      directus.request(readItems('audios', { limit: -1 })),
    ]);

    const fidelityRecords = new Map(
      objectToIterableEntries(
        fidelitySnapshot.val() as Record<string, FidelityCheckRecord>
      )
    );

    const existingRecords = new Map(
      pipeSync(
        audioRecords,
        map((record) => [record.id, record])
      )
    );

    const processRecord = async (record: AudioRecord) => {
      const original = existingRecords.get(record.id);
      const difference = getDifference(original, record);

      return Promise.all([
        record.status === 'active'
          ? finalizeFile(
              fidelityRecords.get(record.sourceFileId).file,
              record,
              original as AudioRecord
            )
          : deletePublicFile(record.id),

        original
          ? util.isDeepStrictEqual(difference, {})
            ? // Skipping records that have not changed
              console.debug('Record', record.id, 'is up to date')
            : (console.debug('Updating record', record.id, difference),
              directus.request(updateItem('audios', original.id, difference)))
          : (console.debug('Creating record', record),
            directus.request(createItem('audios', record))),
      ]);
    };

    // Limiting concurrent requests to the CMS.
    const CONCURRENCY = 100;

    // Awaiting for the first item of the one-item iterator emitted by `drain` in order to trigger the whole pipeline
    // See https://github.com/vitaly-t/iter-ops/discussions/230
    await pipeAsync(
      finalizeAudios(
        fidelityRecords,
        // Casting due to a typing issue in Directus
        audioRecords as AudioRecord[]
      ),
      map(processRecord),
      waitRace(CONCURRENCY),
      drain()
    ).catch(functions.logger.error).first;
  });

interface ShortFileReference {
  bucket: string;
  name: string;
}

interface MP3CreationTask {
  source: ShortFileReference;
  destination: ShortFileReference;
  fileName: string;
  mediaMetadata: Record<string, string>;
}

/**
 * This cloud function creates an MP3 file
 * from another (or same) file using `ffmpeg`.
 *
 * If the source and destination files are same,
 * it just copies the content, replacing the media metadata.
 */
export const createMP3 = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .tasks.taskQueue({ retryConfig: { minBackoffSeconds: 60 } })
  .onDispatch(
    async ({
      source,
      destination,
      fileName,
      mediaMetadata,
    }: MP3CreationTask) => {
      const sourceFile = getStorage().bucket(source.bucket).file(source.name);

      await sourceFile.exists();
      if (!sourceFile.metadata.name || +sourceFile.metadata.size === 0)
        return functions.logger.warn(
          'Source file',
          sourceFile.bucket.name,
          sourceFile.name,
          'does not exist.'
        );

      const destinationFile = getStorage()
        .bucket(destination.bucket)
        .file(destination.name);

      const uploadStream = destinationFile.createWriteStream({
        resumable: false,
        metadata: composeStorageMetadata(fileName, sourceFile.metadata.md5Hash),
      });

      functions.logger.debug(
        'Creating',
        destinationFile.name,
        'from',
        sourceFile.metadata.id
      );

      await Promise.all([
        transcode(
          sourceFile.createReadStream(),
          uploadStream,
          util.isDeepStrictEqual(source, destination) ? copyMP3 : convertToMp3,
          addMediaMetadata(mediaMetadata)
        ),
        finished(uploadStream),
      ]);
    }
  );
