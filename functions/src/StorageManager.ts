/*!
 * sri sri guru gauranga jayatah
 */

import { Storage } from 'firebase-admin/storage';
import { modificationTime } from './modification-time';
import functions = require('firebase-functions');
import admin = require('firebase-admin');
import path = require('path');
import _ = require('lodash');

/*
 * Extracting these types from the transient dependency `@google-cloud/storage`.
 * This package is an optional dependency of `firebase-admin`.
 * This question was discussed in https://github.com/firebase/firebase-admin-node/discussions/1605#discussioncomment-4825470
 * We cannot add `@google-cloud/storage` as a direct dependency to the project
 * because `firebase-admin` refers to an older version of `@google-cloud/storage`,
 * and there will be a type mismatch if we update the direct dependency to the latest version.
 *
 * We cannot import types from a transient dependency, as described in https://github.com/microsoft/TypeScript/issues/38768.
 * Though, we use a workaround described in https://stackoverflow.com/a/70812944/3082178.
 */
export type Bucket = ReturnType<typeof Storage.prototype.bucket>;
export type File = ReturnType<Bucket['file']>;

export type BucketName =
  | 'original'
  | 'edited'
  | 'restored'
  | 'te.uploads'
  | 'se.uploads'
  | 'final'
  | 'parts'; // For transcription

export class StorageManager {
  static getFullBucketName(bucketName: BucketName) {
    return `${bucketName}.${functions.config().project.domain}`;
  }

  static getBucket(bucketName: BucketName) {
    return admin.storage().bucket(this.getFullBucketName(bucketName));
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
  private static getFile(bucketName: BucketName, fileName: string) {
    return this.getBucket(bucketName).file(
      `${this.extractListFromFilename(fileName)}/${
        bucketName === 'original'
          ? this.standardizeFileName(fileName)
          : fileName
      }`
    );
  }

  /**
   * Constructs and returns all the `File` references that should be tried to find requested file.
   * If `bucket` is set, only this bucket is used to build candidates list.
   * Otherwise all the related buckets are used: `original` and `restored` for the source files,
   * and `edited` and `restored` for the track-edited file names.
   *
   * If extension is not included in the `fileName`, both `.flac` and `.mp3` are tried.
   * Order depends on the list. For digital recordings `.mp3` is preferred.
   *
   * @param fileName The file name, with or without extension
   * @param bucket The short name of the bucket, or `undefined` if the file should be sought in multiple appropriate buckets
   */
  static getCandidateFiles(fileName: string, bucket?: BucketName): File[] {
    const extension = path.extname(fileName).toLowerCase();
    const baseName = path.basename(fileName, extension);

    // File is TEd if it has format LIST-001-1
    const isTEd = /^[A-Z]+\d*-\d+-\d+$/.test(baseName);
    const isDigital = baseName.startsWith('DIGI');

    const buckets: BucketName[] = bucket
      ? [bucket]
      : ['restored', isTEd ? 'edited' : 'original'];

    return _.flatMap(buckets, (bucket) =>
      isDigital
        ? [
            this.getFile(bucket, `${baseName}.mp3`),
            this.getFile(bucket, `${baseName}.flac`),
          ]
        : this.getFile(bucket, `${baseName}${extension || '.flac'}`)
    );
  }

  /**
   * Gets the most recent existing file among specified.
   *
   * @param candidates Files to search among.
   * @returns Most recent existing file or `null` if none exists.
   */
  static async getMostRecentFile(candidates: File[]) {
    // Calling to `getMetadata` populates the metadata in the original `File` instance.
    await Promise.all(
      candidates.map((file) => file.getMetadata().catch(() => null))
    );

    const bucketWeight = (file: File) =>
      // Original files are of least priority, other buckets are equal
      file.bucket.name.startsWith('original.') ? 0 : 1;

    return candidates
      .filter((file) => file.metadata?.name) // Filtering out non-existent files
      .sort(
        (a, b) =>
          // By bucket weight descending
          -(bucketWeight(a) - bucketWeight(b)) ||
          // By time created descending
          -(modificationTime(a).toSeconds() - modificationTime(b).toSeconds())
      )
      .shift(); // And returning the most recent one
  }

  static extractListFromFilename = (fileName: string): string => {
    const match = /^\w+(?=-)|Hi(?=\d)/i.exec(fileName);
    if (!match) throw new Error(`Cannot extract list name from "${fileName}"`);

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

  static getDestinationFileForApprovedEdited(fileName: string): File {
    return this.getBucket('edited').file(
      `${this.extractListFromFilename(fileName)}/${fileName}`
    );
  }

  static getDestinationFileForRestoredUpload(fileName: string): File {
    const matches = /^(\w+-\d{1,4}(?:[AB]?|-\d+))(?:_v.*)?$/i.exec(
      path.basename(fileName, path.extname(fileName))
    );

    if (!matches) return null;

    const [, trimmedFileName] = matches;

    try {
      const list = this.extractListFromFilename(trimmedFileName);
      return this.getBucket('restored').file(
        `${list}/${trimmedFileName.toUpperCase()}${path.extname(fileName)}`
      );
    } catch (error) {
      console.error(error.message);
      return null;
    }
  }
}
