/*!
 * sri sri guru gauranga jayatah
 */

export class AudioAnnotation {
  entireFile: boolean;
  beginning: string; // h:mm:ss
  ending: string; // h:mm:ss
  type: string;
  description: string;

  constructor(source: Partial<AudioAnnotation>) {
    Object.assign(this, source);
  }

  static parse(text: string): AudioAnnotation {
    const regex = /((Entire file)|(.*?)–(.*)):(.*)—(.*)/;
    const matches = regex.exec(text);
    if (!matches) return null;

    return new AudioAnnotation({
      entireFile: matches[2] ? true : null,
      beginning: matches[2] ? null : matches[3],
      ending: matches[2] ? null : matches[4],
      type: matches[5].trim(),
      description: matches[6].trim(),
    });
  }

  public toString(): string {
    return `${
      this.entireFile ? 'Entire file' : `${this.beginning}–${this.ending}`
    }: ${this.type} — ${this.description}`;
  }
}

export class AudioAnnotationArray extends Array<AudioAnnotation> {
  constructor(items?: Array<AudioAnnotation>) {
    super(...items);
  }

  static parse(text: string) {
    return new AudioAnnotationArray(
      text.split('\n').map(line => AudioAnnotation.parse(line))
    );
  }

  public toString(): string {
    return this.join('\n');
  }
}
