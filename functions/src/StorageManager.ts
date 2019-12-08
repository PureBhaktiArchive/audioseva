/*!
 * sri sri guru gauranga jayatah
 */

// tslint:disable-next-line: no-implicit-dependencies
import { File } from '@google-cloud/storage';
import * as functions from 'firebase-functions';
import { URL } from 'url';
import admin = require('firebase-admin');

export type BucketName = 'original' | 'edited' | 'restored' | 'te.uploads';

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

  /**
   * Transforms the file name into the object path and returns a File instance.
   *
   * Prepends the list name.
   * Standardizes the file name for the `original` bucket.
   *
   * @param bucketName The short name of the bucket
   * @param fileName The file name in the bucket, without path.
   */
  static getFile(bucketName: BucketName, fileName: string) {
    return this.getBucket(bucketName).file(
      `${this.extractListFromFilename(fileName)}/${
        bucketName === 'restored'
          ? fileName
          : this.standardizeFileName(fileName)
      }`
    );
  }

  /**
   * The method will find the requested file in the storage.
   *
   * Original file names are sought in the `edited` bucket first (SE before CR cases)
   * and then in the `original` bucket.
   *
   * @param fileName File name to find. Can be original or edited file name
   */
  static async findFile(fileName: string) {
    return this.findExistingFile(
      this.getFile('restored', fileName),
      this.getFile('original', fileName)
    );
  }

  static async findExistingFile(...files: File[]) {
    for (const file of files) if ((await file.exists())[0]) return file;
    return null;
  }

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
}
