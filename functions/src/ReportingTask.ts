/*!
 * sri sri guru gauranga jayatah
 */

import { Allotment } from './Allotment';

export interface ReportingTask extends Allotment {
  fileName: string;
  token?: string;
}
