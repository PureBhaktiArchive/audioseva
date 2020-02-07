/*!
 * sri sri guru gauranga jayatah
 */

// tslint:disable-next-line: no-implicit-dependencies
import { File } from '@google-cloud/storage';
import { URL } from 'url';
import functions = require('firebase-functions');
import admin = require('firebase-admin');
import path = require('path');

export type BucketName =
  | 'original'
  | 'edited'
  | 'restored'
  | 'te.uploads'
  | 'se.uploads';

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
   * and then in the `original` bucket. Exact bucket name can be specified.
   *
   * Returns `null` if no file is found.
   *
   * @param fileName File name to find.
   * @param bucket Optional bucket name to find file exactly in that bucket.
   */
  static async findFile(fileName: string, bucket?: BucketName) {
    return bucket
      ? this.findExistingFile(this.getFile(bucket, fileName))
      : this.findExistingFile(
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

  static getDestinationFileForRestoredUpload(fileName: string): File {
    const matches = /^(\w+)-(\d{1,4}.*?)(?:[\s_]+v[-\d\s]+)?$/i.exec(
      path.basename(fileName, path.extname(fileName))
    );

    if (!matches) return null;

    const [, list, serial] = matches;
    return this.getBucket('restored').file(
      `${list}/${list}-${serial}${path.extname(fileName)}`
    );
  }
}
