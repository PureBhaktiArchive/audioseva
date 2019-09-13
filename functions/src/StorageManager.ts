/*!
 * sri sri guru gauranga jayatah
 */

// tslint:disable-next-line: no-implicit-dependencies
import { File } from '@google-cloud/storage';
import * as functions from 'firebase-functions';
import { extractListFromFilename } from './helpers';
import admin = require('firebase-admin');

export class StorageManager {
  public static rootBucketDomain = functions.config().project.domain;
  public static originalFilesBucket = `original.${StorageManager.rootBucketDomain}`;
  public static trackEditedUploadsBucket = `te.uploads.${StorageManager.rootBucketDomain}`;
  public static trackEditedFinalBucket = `edited.${StorageManager.rootBucketDomain}`;

  static getPublicURL(bucket: string, filePath: string): any {
    return `https://storage.googleapis.com/${bucket}/${filePath}`;
  }

  static getEditedFile(taskId: string) {
    return new File(
      admin.storage().bucket(this.trackEditedFinalBucket),
      `${extractListFromFilename(taskId)}/${taskId}.flac`
    );
  }
}
