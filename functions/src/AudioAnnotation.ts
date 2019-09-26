/*!
 * sri sri guru gauranga jayatah
 */

import { DateTimeConverter } from './DateTimeConverter';
import { TimingInterval } from './TimingInterval';

export class AudioAnnotation extends TimingInterval {
  entireFile: boolean;
  type: string;
  description: string;

  constructor(source: Partial<AudioAnnotation>) {
    super();
    Object.assign(this, source);
  }

  static parse(text: string): AudioAnnotation {
    const regex = /((Entire file)|(.*?)–(.*)):\s(.*)—(.*)/;
    const matches = regex.exec(text);
    if (!matches) return null;

    return new AudioAnnotation({
      entireFile: matches[2] ? true : null,
      beginning: matches[2]
        ? null
        : DateTimeConverter.humanToSeconds(matches[3]),
      ending: matches[2] ? null : DateTimeConverter.humanToSeconds(matches[4]),
      type: matches[5].trim(),
      description: matches[6].trim(),
    });
  }

  public toString(): string {
    return `${
      this.entireFile
        ? 'Entire file'
        : `${DateTimeConverter.secondsToHuman(
            this.beginning
          )}–${DateTimeConverter.secondsToHuman(this.ending)}`
    }: ${this.type} — ${this.description}`;
  }
}

export class AudioAnnotationArray extends Array<AudioAnnotation> {
  constructor(items?: Array<AudioAnnotation>) {
    super(...items);
  }

  static parse(text: string) {
    return text
      ? new AudioAnnotationArray(
          text.split('\n').map(line => AudioAnnotation.parse(line))
        )
      : [];
  }

  public toString(): string {
    return this.join('\n');
  }
}
