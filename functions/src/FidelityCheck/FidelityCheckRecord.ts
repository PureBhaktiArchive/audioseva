/*!
 * sri sri guru gauranga jayatah
 */

import { StorageFileReference } from '../StorageFileReference';
import { FidelityCheckRow } from './FidelityCheckRow';

interface ContentDetails {
  title: string;
  topics: string;
  date: string;
  timeOfDay: string;
  location: string;
  category: string;
  languages: string;
  percentage: number;
  seriesInputs: string;
  soundQualityRating: string;
}

export interface FidelityCheckRecord {
  file: StorageFileReference;
  taskId: string;
  contentDetails: ContentDetails;
  fidelityCheck: {
    timestamp: number;
    author: string;
    approved: boolean;
  };
}

export const backMapping: Record<
  keyof ContentDetails | 'file' | 'taskId',
  keyof FidelityCheckRow | 'File'
> = {
  file: 'File',
  taskId: 'Task ID',
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
