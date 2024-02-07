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

const transcodingQueue = getFunctions().taskQueue('Final-createMP3');

const composeStorageMetadata = (fileName: string, md5Hash: string) => ({
  contentType: 'audio/mpeg',
  contentDisposition: contentDisposition(fileName),
  metadata: {
    sourceMd5Hash: md5Hash,
  },
});

const finalizeFile = async (
  file: StorageFileReference,
  record: AudioRecord,
  original: AudioRecord
) => {
  const publicFile = getStorage()
    .bucket(functions.config().final?.public?.bucket)
    .file(`${record.id}.mp3`);

  if (record.status !== 'active') {
    console.debug('Deleting public file', publicFile.name);
    publicFile.delete({ ignoreNotFound: true });
    return;
  }

  const sourceFile = getStorage().bucket(file.bucket).file(file.name, {
    generation: file.generation,
  });
  const finalFile = StorageManager.getBucket('final').file(
    `${record.id}${path.extname(file.name)}`
  );

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

    transcodingQueue.enqueue({
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
    } as MP3CreationTask);
  }

  // Updating media metadata if it changed
  else if (
    original?.status !== 'active' ||
    !util.isDeepStrictEqual(composeMediaMetadata(original), mediaMetadata)
  ) {
    console.debug('Updating media metadata for public file', publicFile.name);
    transcodingQueue.enqueue({
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
    } as MP3CreationTask);
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

export const publish = functions.tasks.taskQueue().onDispatch(async () => {
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
      finalizeFile(
        fidelityRecords.get(record.sourceFileId).file,
        record,
        original as AudioRecord
      ),

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
  const CONCURRENCY = 20;

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

interface MP3CreationTask {
  source: StorageFileReference;
  destination?: StorageFileReference;
  fileName: string;
  mediaMetadata: Record<string, string>;
}

export const createMP3 = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .tasks.taskQueue({ retryConfig: { minBackoffSeconds: 60 } })
  .onDispatch(
    async ({
      source,
      destination = source,
      fileName,
      mediaMetadata,
    }: MP3CreationTask) => {
      const sourceFile = getStorage()
        .bucket(source.bucket)
        .file(source.name, { generation: source.generation });

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
          path.extname(source.name) === '.mp3' ? copyMP3 : convertToMp3,
          addMediaMetadata(mediaMetadata)
        ),
        finished(uploadStream),
      ]);
    }
  );
