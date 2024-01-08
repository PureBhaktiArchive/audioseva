/*!
 * sri sri guru gauranga jayatah
 */

import { FinalContentDetails } from '../ContentDetails';

export interface NormalRecord extends FinalContentDetails {
  /** The File ID in the Archive */
  id: number;
}

export interface FinalRecord extends NormalRecord {
  sourceFileId: string;
  approvalDate: string; // ISO format
  redirectTo: number;
}
