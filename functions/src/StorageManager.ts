/*!
 * sri sri guru gauranga jayatah
 */

// tslint:disable-next-line: no-implicit-dependencies
import { File } from '@google-cloud/storage';
import * as functions from 'firebase-functions';
import { URL } from 'url';
import { extractListFromFilename } from './helpers';
import admin = require('firebase-admin');

export type BucketName = 'original' | 'edited' | 'te.uploads';

export class StorageManager {
  static getFullBucketName(bucketName: BucketName) {
    return `${bucketName}.${functions.config().project.domain}`;
  }

  static getBucket(bucketName: BucketName) {
    return admin.storage().bucket(this.getFullBucketName(bucketName));
  }

  static getPublicURL(file: File) {
    return new URL(
      `${file.bucket.name}/${file.name}`,
      'https://storage.googleapis.com'
    ).toString();
  }

  static getFile(bucketName: BucketName, fileName: string) {
    return new File(
      this.getBucket(bucketName),
      `${extractListFromFilename(fileName)}/${fileName}`
    );
  }

  static getEditedFile(taskId: string) {
    return this.getFile('edited', `${taskId}.flac`);
  }
}
