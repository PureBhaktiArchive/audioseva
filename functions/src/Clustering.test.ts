/*!
 * sri sri guru gauranga jayatah
 */

import { clusterize } from './Clustering';
import _ = require('lodash');

describe('Clustering', () => {
  test('works properly', () => {
    const items = [
      { a: 'file1', b: 'D20030220', c: '' },
      { a: 'file2', b: 'D20030220', c: 'S033144832' },
      { a: 'file3', b: 'D20030220', c: 'S015572887' },
      { a: 'file4', b: 'D20030220', c: 'S015572887' },
      { a: 'file4', b: 'D20090212', c: 'S033144832' },
      { a: 'file5', b: 'D20090212', c: '' },
      { a: 'file6', b: 'D20090214', c: '' },
      { a: 'file6', b: 'D20090214', c: '' },
    ];
    expect(clusterize(items, 'b', 'c')).toEqual([
      'D20030220+D20090212+S015572887+S033144832',
      'D20030220+D20090212+S015572887+S033144832',
      'D20030220+D20090212+S015572887+S033144832',
      'D20030220+D20090212+S015572887+S033144832',
      'D20030220+D20090212+S015572887+S033144832',
      'D20030220+D20090212+S015572887+S033144832',
      'D20090214',
      'D20090214',
    ]);
  });

  test('is performant', () => {
    const items = _.range(1, 17000).map((i) => ({
      a: `file${i}`,
      b: `B${_.random(100000)}`,
      c: `C${_.random(100000)}`,
    }));

    const t = process.hrtime();
    clusterize(items, 'b', 'c');
    const [, nano] = process.hrtime(t);
    expect(nano).toBeLessThan(5e8);
  });
});
