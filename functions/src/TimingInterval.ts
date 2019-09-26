/*!
 * sri sri guru gauranga jayatah
 */

export class TimingInterval {
  beginning: number;
  ending: number;

  static IsValid = (object: TimingInterval) =>
    !Number.isNaN(object.beginning) && !Number.isNaN(object.ending);
}
