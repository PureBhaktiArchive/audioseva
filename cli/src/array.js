/*!
 * sri sri guru gauranga jayatah
 */

/**
 * @template V
 * @template K
 * @param {V[]} array
 * @param {(i: V) => K} keySelector
 * @returns {Map<K, V[]>}
 */
export const groupBy = (array, keySelector) =>
  array.reduce((map, item) => {
    const key = keySelector(item);
    map.get(key)?.push(item) ?? map.set(key, [item]);
    return map;
  }, /** @type {Map<K, V[]>} */ (new Map()));
