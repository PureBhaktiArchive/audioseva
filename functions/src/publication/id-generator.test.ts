/*!
 * sri sri guru gauranga jayatah
 */

import { createIdGenerator } from './id-generator';

describe('id generator', () => {
  test('should generate consequent numbers', () => {
    // No IDs exist yet
    const generator = createIdGenerator(() => false);
    for (let id = 1; id < 200; id++)
      expect(generator.next().value).toBe<number>(id);
  });
  test('should skip existing numbers', () => {
    // Some IDs exist
    const generator = createIdGenerator((id) => [1, 3, 6, 100].includes(id));
    expect(generator.next().value).toBe<number>(2);
    expect(generator.next().value).toBe<number>(4);
    expect(generator.next().value).toBe<number>(5);
    expect(generator.next().value).toBe<number>(7);
    expect(generator.next().value).toBe<number>(8);
    expect(generator.next().value).toBe<number>(9);
  });
});
