/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';

export class StorageManager {
  public static rootBucketDomain = functions.config().project.domain;
  public static originalFilesBucket = `original.${StorageManager.rootBucketDomain}`;
  public static trackEditedUploadsBucket = `te.uploads.${StorageManager.rootBucketDomain}`;
  public static trackEditedFilesBucket = `edited.${StorageManager.rootBucketDomain}`;

  static getPublicURL(bucket: string, filePath: string): any {
    return `https://storage.googleapis.com/${bucket}/${filePath}`;
  }
}
