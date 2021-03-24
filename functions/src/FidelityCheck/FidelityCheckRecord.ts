/*!
 * sri sri guru gauranga jayatah
 */

import { StorageFileReference } from '../StorageFileReference';
import { ContentDetails } from './ContentDetails';
import { FidelityCheckRow } from './FidelityCheckRow';

export interface FidelityCheckRecord {
  file: StorageFileReference;
  taskId: string;
  contentDetails: ContentDetails;
  fidelityCheck: {
    timestamp: number;
    author: string;
  };
  approval: {
    readyForArchive: boolean;
    timestamp: number;
    topicsReady: boolean;
  };
}

export const backMapping: Record<
  keyof ContentDetails,
  keyof FidelityCheckRow
> = {
  title: 'Suggested Title',
  topics: 'Topics',
  date: 'Date (yyyymmdd format)',
  timeOfDay: 'AM/PM',
  location: 'Location',
  category: 'Category',
  languages: 'Lecture Language',
  percentage: 'Srila Gurudeva Timing',
  seriesInputs: 'Series/Sastra Inputs',
  soundQualityRating: 'Sound Rating',
};
