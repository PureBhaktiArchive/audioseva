import { readItem } from '@directus/sdk';
import contentDisposition from 'content-disposition';
import { getStorage } from 'firebase-admin/storage';
import * as functions from 'firebase-functions';
import { finished } from 'node:stream/promises';
import * as path from 'path';
import { StorageManager } from '../StorageManager';
import { directus } from './directus';
import { composeFileName, composeMediaMetadata } from './metadata';
import { addMediaMetadata, convertToMp3, transcode } from './transcode';

export const convert = functions.storage
  .bucket(StorageManager.getFullBucketName('final'))
  .object()
  .onFinalize(async (object) => {
    const id = +path.basename(object.name, path.extname(object.name));
    if (Number.isNaN(id))
      return functions.logger.warn('Object name is not a number:', object.name);

    const mp3File = getStorage()
      .bucket(functions.config().final?.public?.bucket)
      .file(`${id}.mp3`);

    const [[mp3Exists], record] = await Promise.all([
      mp3File.exists(),
      directus.request(readItem('audios', id)),
    ]);

    if (
      mp3Exists &&
      mp3File.metadata.metadata?.sourceMd5Hash === object.md5Hash
    )
      // MP3 file was created from the same source file, no need transcoding
      return functions.logger.info('MP3 file already exists');

    const uploadStream = mp3File.createWriteStream({
      resumable: false,
      metadata: {
        contentType: 'audio/mpeg',
        contentDisposition: contentDisposition(composeFileName(record)),
        metadata: {
          sourceMd5Hash: object.md5Hash,
        },
      },
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
