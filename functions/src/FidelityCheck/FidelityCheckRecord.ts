/*!
 * sri sri guru gauranga jayatah
 */

import { StorageFileReference } from '../StorageFileReference';
import { ContentDetails } from './ContentDetails';
import { FidelityCheckRow } from './FidelityCheckRow';

export interface Approval {
  readyForArchive: boolean;
  timestamp: number;
  topicsReady: boolean;
}

export interface FidelityCheck {
  timestamp: number;
  author: string;
}

export interface FidelityCheckRecord {
  file: StorageFileReference;
  taskId: string;
  contentDetails: ContentDetails;
  fidelityCheck: FidelityCheck;
  approval: Approval;
}

export const backMapping: Record<
  keyof ContentDetails,
  keyof FidelityCheckRow
> = {
  title: 'Suggested Title',
  topics: 'Topics',
  date: 'Date (yyyymmdd format)',
  dateUncertain: 'Date uncertain',
  timeOfDay: 'AM/PM',
  location: 'Location',
  locationUncertain: 'Location uncertain',
  category: 'Category',
  languages: 'Lecture Language',
  percentage: 'Srila Gurudeva Timing',
  otherSpeaker: 'Other Guru-varga',
  seriesInputs: 'Series/Sastra Inputs',
  soundQualityRating: 'Sound Rating',
};
