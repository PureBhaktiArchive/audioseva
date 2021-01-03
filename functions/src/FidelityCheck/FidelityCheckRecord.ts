/*!
 * sri sri guru gauranga jayatah
 */

import { StorageFileReference } from '../StorageFileReference';

export interface FidelityCheckRecord {
  file: StorageFileReference;
  taskId: string;
  contentDetails: {
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
  };
  fidelityCheck: {
    timestamp: number;
    author: string;
    approved: boolean;
  };
}
