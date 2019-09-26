/*!
 * sri sri guru gauranga jayatah
 */

import { Allotment } from './Allotment';

export class ReportingTask extends Allotment {
  public fileName: string;

  constructor(fileName: string, allotment: Allotment) {
    super(allotment);
    this.fileName = fileName;
  }
}
