/*!
 * sri sri guru gauranga jayatah
 */

// tslint:disable-next-line: no-implicit-dependencies
import { File } from '@google-cloud/storage';
import * as functions from 'firebase-functions';
import { URL } from 'url';
import { extractListFromFilename } from './helpers';
import admin = require('firebase-admin');

export class StorageManager {
  public static rootBucketDomain = functions.config().project.domain;
  public static originalFilesBucket = StorageManager.getBucketName('original');
  public static trackEditedUploadsBucket = StorageManager.getBucketName(
    'te.uploads'
  );
  public static trackEditedFinalBucket = StorageManager.getBucketName('edited');

  static getBucketName(bucketSubDomain: string) {
    return `${bucketSubDomain}.${StorageManager.rootBucketDomain}`;
  }

  static getPublicURL(bucket: string, fileName: string) {
    return new URL(
      `/${bucket}/${extractListFromFilename(fileName)}/${fileName}`,
      'https://storage.googleapis.com'
    ).toString();
  }

  static getEditedFile(taskId: string) {
    return new File(
      admin.storage().bucket(this.trackEditedFinalBucket),
      `${extractListFromFilename(taskId)}/${taskId}.flac`
    );
  }
}
