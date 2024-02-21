/*!
 * sri sri guru gauranga jayatah
 */

import { FinalContentDetails } from '../ContentDetails';

// Record as it is present in the Directus CMS
export type AudioRecord = InactiveRecord | ActiveRecord | RedirectionRecord;

interface BaseRecord {
  id: number;
  sourceFileId: string;
}

export interface InactiveRecord extends BaseRecord {
  status: 'inactive';
}

export interface ActiveRecord extends BaseRecord, FinalContentDetails {
  status: 'active';
  duration: number;
  approvalDate: string; // ISO format
}

export interface RedirectionRecord extends BaseRecord {
  status: 'redirect';
  redirectTo: number;
}
