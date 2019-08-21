/*!
 * sri sri guru gauranga jayatah
 */

export class AudioChunkAnnotation {
  entireFile: boolean;
  beginning: string; // h:mm:ss
  ending: string; // h:mm:ss
  type: string;
  description: string;

  constructor(source: Partial<AudioChunkAnnotation>) {
    Object.assign(this, source);
  }

  static parse(text: string): AudioChunkAnnotation {
    const regex = /((Entire file)|(.*?)–(.*)):(.*)—(.*)/;
    const matches = regex.exec(text);
    if (!matches) return null;

    return new AudioChunkAnnotation({
      entireFile: matches[2] ? true : null,
      beginning: matches[2] ? null : matches[3],
      ending: matches[2] ? null : matches[4],
      type: matches[5].trim(),
      description: matches[6].trim(),
    });
  }

  public format() {
    return `${
      this.entireFile ? 'Entire file' : `${this.beginning}–${this.ending}`
    }: ${this.type} — ${this.description}`;
  }
}

AudioChunkAnnotation.prototype.toString = function(this: AudioChunkAnnotation) {
  return this.format();
};

export class AudioFileAnnotation {
  chunks: AudioChunkAnnotation[];

  constructor(items: AudioChunkAnnotation[]) {
    this.chunks = items;
  }

  static parse(text: string) {
    return new AudioFileAnnotation(
      text.split('\n').map(line => AudioChunkAnnotation.parse(line))
    );
  }

  public format() {
    return this.chunks.map(i => i.toString()).join('\n');
  }
}

AudioFileAnnotation.prototype.toString = function(this: AudioFileAnnotation) {
  return this.format();
};
