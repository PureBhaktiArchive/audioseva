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
        second2: ['value1', 'value2', 3],
      },
      root3: 'value right away',
      root4: null,
      root5: undefined,
      root6: 0,
      root7: '',
      root8: NaN,
    };

    expect(flatten(source, 'prefix/')).toMatchSnapshot();
  });
});
