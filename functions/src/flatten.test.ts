/*!
 * sri sri guru gauranga jayatah
 */

import { flatten } from './flatten';

describe('flatten', () => {
  test('should flatten pure object', () => {
    const source = {
      root1: {
        second1: {
          leaf1: 'string',
          leaf2: 108,
          timestamp: {
            '.sv': 'TIMESTAMP',
          },
        },
      },
      root2: {
        second1: ['value1', 'value2', 3],
      },
      root3: 'value right away',
    };

    const flattened = {
      'prefix/root1/second1/leaf1': 'string',
      'prefix/root1/second1/leaf2': 108,
      'prefix/root1/second1/timestamp': {
        '.sv': 'TIMESTAMP',
      },
      'prefix/root2/second1/0': 'value1',
      'prefix/root2/second1/1': 'value2',
      'prefix/root2/second1/2': 3,
      'prefix/root3': 'value right away',
    };

    expect(flatten(source, 'prefix/')).toEqual(flattened);
  });
});
