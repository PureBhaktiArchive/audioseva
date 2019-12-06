/*!
 * sri sri guru gauranga jayatah
 */

// tslint:disable-next-line: no-implicit-dependencies
import { File } from '@google-cloud/storage';
import * as functions from 'firebase-functions';
import { URL } from 'url';
import admin = require('firebase-admin');

export type BucketName = 'original' | 'edited' | 'te.uploads';

export const taskIdRegex = '^[a-zA-Z]+-\\d+';

export class StorageManager {
  static extractListFromFilename = (fileName: string): string => {
    const match = fileName.match(/^\w+(?=-)|Hi(?=\d)/i);
    if (!match) return null;

    const list = match[0].toUpperCase();
    return list === 'HI' ? 'ML1' : list;
  };

  static standardizeFileName = (fileName: string) => {
    if (fileName.startsWith('ML2-')) return fileName.replace(/^ML2-/, '');

    return fileName
      .replace(/^Hi/i, 'ML1-')
      .replace(
        /^(ML[12]|[a-zA-Z]+)-(\d{1,4})\s*([\w\s]*)(\.\w{3,4})$/i,
        (
          match,
          list: string,
          serial: string,
          suffix: string,
          extension: string,
          index,
          original
        ) =>
          [
            list.toUpperCase(),
            '-',
            serial.padStart(list === 'ML2' ? 4 : 3, '0'),
            suffix.toUpperCase().replace(/[-\s]/g, ''),
            extension,
          ].join('')
      );
  };

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
      `${this.extractListFromFilename(fileName)}/${fileName}`
    );
  }

  /**
   * The method will detect the file name format
   * and find the file in one of the 3 buckets: original, restored, edited.
   * @param fileName File name to find. Can be original or edited file name
   */
  static findFile(fileName: string): File {
    return this.getFile('original', fileName);
  }

  static getEditedFile(taskId: string) {
    return this.getFile('edited', `${taskId}.flac`);
  }
}
