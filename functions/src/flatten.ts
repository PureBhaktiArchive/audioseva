/*!
 * sri sri guru gauranga jayatah
 */

/**
 * Flattens nested objects so that the resulting object is one-level.
 * Property names are combined with forward slash as separator.
 * This function is useful for preparing an object for Firebase RTDB `update` function.
 *
 * @param source object to flatten
 * @param prefix @string prefix to add to the property path
 * @param target target object
 */
export const flatten = (source: unknown, prefix = '', target = {}) => {
  Object.entries(source).forEach(([key, value]) => {
    const nestedKey = `${prefix}${key}`;

    // Some children should be kept as is
    const keepAsIs =
      // Only objects should be flattened
      typeof value !== 'object' ||
      // typeof null is object https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof#typeof_null
      value === null ||
      // Firebase Server Values should be kept as is
      value['.sv'] !== undefined ||
      // Arrays should be kept as is because otherwise other stale array elements are kept in the database
      Array.isArray(value);

    if (keepAsIs) target[nestedKey] = value;
    else flatten(value, `${nestedKey}/`, target);
  });
  return target;
};
