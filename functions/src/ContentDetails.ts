/*!
 * sri sri guru gauranga jayatah
 */

interface CommonContentDetails {
  title: string;
  topics: string;
  date: string;
  dateUncertain: boolean;
  timeOfDay: string;
  location: string;
  locationUncertain: boolean;
  category: string;
  percentage: number;
  soundQualityRating: string;
}

export interface ContentDetails extends CommonContentDetails {
  languages: string;
  otherSpeakers?: string;
  seriesInputs?: string;
}

export interface FinalContentDetails extends CommonContentDetails {
  languages: string[];
  otherSpeakers?: string[];
}
