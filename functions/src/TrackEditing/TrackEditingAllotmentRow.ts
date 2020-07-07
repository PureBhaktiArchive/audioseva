/*!
 * sri sri guru gauranga jayatah
 */

import { AllotmentRow } from '../AllotmentRow';

export interface TrackEditingAllotmentRow extends AllotmentRow {
  'Task ID': string;
  'SEd?': string;
  'Upload Link'?: string;
  'Upload Date'?: number;
  'Latest Resolution'?: string;
  'Resolution Date'?: number;
  'Checked By'?: string;
}
