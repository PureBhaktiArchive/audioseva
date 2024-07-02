import { getDatabase } from 'firebase-admin/database';
import * as path from 'path';
import { StorageFileReference } from './StorageFileReference';
import { BucketName, File } from './StorageManager';

export const getMetadataCacheRef = () =>
  getDatabase().ref('files').child('metadata');

export const getFileMetadataPath = (file: File | StorageFileReference) =>
  `${(typeof file.bucket === 'string' ? file.bucket : file.bucket.name)
    .split('.')
    .at(0)}/${path.basename(file.name, path.extname(file.name))}/${
    file.generation || ('metadata' in file && file.metadata.generation)
  }`;

export const getFileDurationPath = (file: File | StorageFileReference) =>
  `${getFileMetadataPath(file)}/duration`;

export interface FileMetadataCache {
  name: string;
  duration?: number;
  size: number;
  timeCreated: number;
  timeDeleted?: number;
  crc32c: string;
  md5Hash: string;
}
type FileName = string;
type GenerationNumber = number;
export type Dump = Record<
  BucketName,
  Record<FileName, Record<GenerationNumber, FileMetadataCache>>
>;
