/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { URL } from 'url';

export const frontendUrl = new URL(
  `https://app.${functions.config().project.domain}`
);

/**
 * Extract list from filename supplied as argument
 */
export const extractListFromFilename = (fileName: string): string => {
  const match = fileName.match(/^\w+(?=-)|Hi(?=\d)/i);
  if (!match) return null;

  const list = match[0].toUpperCase();
  return list === 'HI' ? 'ML1' : list;
};

export const standardizeFileName = (fileName: string) => {
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

export const taskIdRegex = '^[a-zA-Z]+-\\d+';

// Inspired by https://medium.com/@KevinBGreene/typescript-modeling-required-fields-with-mapped-types-f7bf17688786
export type RequireOnly<T, K extends keyof T> = {
  [X in Exclude<keyof T, K>]?: T[X];
} &
  {
    [P in K]-?: T[P];
  };
