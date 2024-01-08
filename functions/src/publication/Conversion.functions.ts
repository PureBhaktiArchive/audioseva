import { readItem } from '@directus/sdk';
import { getStorage } from 'firebase-admin/storage';
import * as functions from 'firebase-functions';
import { finished } from 'node:stream/promises';
import * as path from 'path';
import { StorageManager } from '../StorageManager';
import { addMediaMetadata, convertToMp3, transcode } from './transcode';
import { directus } from './directus';
import {
  composeFileName,
  composeMediaMetadata,
  composeStorageMetadata,
} from './metadata';

export const convert = functions.storage
  .bucket(StorageManager.getFullBucketName('final'))
  .object()
  .onFinalize(async (object) => {
    const record = await directus.request(
      readItem('audios', path.basename(object.name, path.extname(object.name)))
    );

    const mp3File = getStorage()
      .bucket(functions.config().final?.public?.bucket)
      .file(`${record.id}.mp3`);

    // Doing nothing if MP3 exists and it was created from the same source file
    if (
      (await mp3File.exists()).shift() &&
      mp3File.metadata.metadata?.sourceMd5Hash === object.md5Hash
    )
      return;

    const uploadStream = mp3File.createWriteStream({
      resumable: false,
      metadata: composeStorageMetadata(composeFileName(record), object.md5Hash),
    });

    functions.logger.debug('Transcoding file', object.id, 'to', mp3File.id);

    await Promise.all([
      transcode(
        getStorage().bucket(object.bucket).file(object.name).createReadStream(),
        uploadStream,
        convertToMp3,
        addMediaMetadata(composeMediaMetadata(record))
      ),
      finished(uploadStream),
    ]);
  });
