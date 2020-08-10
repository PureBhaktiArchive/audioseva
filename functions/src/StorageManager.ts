/*!
 * sri sri guru gauranga jayatah
 */

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
        bucketName === 'original'
          ? this.standardizeFileName(fileName)
          : fileName
      }`
    );
  }

  /**
   * Method finds the first existing file among specified.
   *
   * @param files Files to search among.
   * @returns First existing file or `null` if none exists.
   */
  static async findExistingFile(...files: File[]) {
    for (const file of files) if ((await file?.exists())?.shift()) return file;
    return null;
  }

  static extractListFromFilename = (fileName: string): string => {
    // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
    const match = fileName.match(/^\w+(?=-)|Hi(?=\d)/i);
    if (!match) return null;

    const list = match[0].toUpperCase();
    return list === 'HI' ? 'ML1' : list;
  };

  static standardizeFileName = (fileName: string) =>
    fileName
      // ML2 files are just untouched, only the list is removed.
      .replace(/^ML2-/, '')

      // Standardizing ML1 list name
      .replace(/^Hi/i, 'ML1-')

      //  For HI (ML1) list there are some files without a suffix (Hi201).
      //  Implying “A” when the suffix is empty.
      .replace(/^(ML1-\d+)(\.\w{3,4})$/, '$1A$2')

      // Main replacement
      .replace(
        //(list         )-(serial )   (suffix )(extension)
        /^(ML1|[a-zA-Z]+)-(\d{1,4})\s*([\w\s]*)(\.\w{3,4})$/i,
        (
          match,
          list: string,
          serial: string,
          suffix: string,
          extension: string
        ) =>
          [
            list.toUpperCase(),
            '-',
            serial.padStart(list === 'ML2' ? 4 : 3, '0'),
            suffix.toUpperCase().replace(/[-\s]/g, ''),
            extension,
          ].join('')
      );

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
