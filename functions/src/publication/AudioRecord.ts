import { FinalContentDetails } from '../ContentDetails';

// Record as it is present in the Directus CMS
export interface AudioRecord extends FinalContentDetails {
  id: number;
  sourceFileId: string;
}
