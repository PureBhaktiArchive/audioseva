/*!
 * sri sri guru gaurangau jayatah
 */

import contentDisposition from 'content-disposition';
import { NormalRecord } from './FinalRecord';
import languageCodes from './language-codes.json';

// Languages should come in this order, all other languages afterwards.
// Reversing so that other languages go after these. Note a minus in the sort function.
const languagesOrder = ['Hindi', 'English', 'Bengali'].reverse();

/**
 * Using data from https://datahub.io/core/language-codes#resource-language-codes
 */
const languageToISO = languageCodes
  // Sorting to make exact matches come first
  .sort((a, b) => a.English.length - b.English.length);

/**
 * Abbreviates languages to their three-letter ISO 639 codes.
 * @param languages Languages list in English
 * @returns A comma-separated list of language codes in ISO 639-2/T, upper case.
 */
export const abbreviateLanguages = (languages: string[]): string =>
  languages
    // Minus because the order array is reversed.
    .sort((a, b) => -(languagesOrder.indexOf(a) - languagesOrder.indexOf(b)))
    .flatMap((language) => {
      const english = language.toLowerCase();
      const info = languageToISO.find((info) =>
        info.English.toLowerCase()
          // Using `startsWith` because some languages are present as "Spanish; Castilian"
          .startsWith(english)
      );
      return info?.['alpha3-t'] || info?.['alpha3-b'];
    })
    .join(',')
    .toUpperCase() || null; // Converting an empty string to `null`

export function composeFileName(record: NormalRecord): string {
  return [
    record.date ?? 'UNDATED',
    record.timeOfDay?.toUpperCase(),
    abbreviateLanguages(record.languages),
    '—',
    [record.title, record.location].filter(Boolean).join(', '),
    `(#${String(record.id).padStart(4, '0')}).mp3`,
  ]
    .filter(Boolean) // removing empty/undefined components
    .join(' ')
    .replace(/[\\/?*:|"<>]/g, '');
}

export const composeMediaMetadata = (
  record: NormalRecord
): Record<string, string> => ({
  'BVNM Archive ID': String(record.id),
  title: record.title,
  date: record.date?.substring(0, 4),
});

export const composeStorageMetadata = (
  fileName: string,
  sourceMd5Hash: string
) => ({
  contentDisposition: contentDisposition(fileName),
  metadata: {
    sourceMd5Hash,
  },
});
