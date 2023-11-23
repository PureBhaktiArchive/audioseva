/*!
 * sri sri guru gauranga jayatah
 */

export class MockStorage {
  buckets: { [name: string]: MockBucket };

  constructor() {
    this.buckets = {};
  }

  bucket(name: string) {
    return this.buckets[name] || (this.buckets[name] = new MockBucket(name));
  }
}

export class MockBucket {
  files: { [name: string]: MockFile };

  constructor(public name: string) {
    this.files = {};
  }

  file(name: string) {
    return this.files[name] || (this.files[name] = new MockFile(this, name));
  }
}

export class MockFile {
  constructor(
    public bucket: MockBucket,
    public name: string
  ) {}

  delete() {
    return Promise.resolve();
  }
}
