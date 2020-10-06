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
export const flatten = (source, prefix = '', target = {}) =>
  Object.entries(source).reduce((memo, [key, val]) => {
    const nestedKey = `${prefix}${key}`;
    if (typeof val === 'object' && val && val['.sv'] === undefined) {
      flatten(val, `${nestedKey}/`, memo);
    } else {
      target[nestedKey] = val;
    }
    return memo;
  }, target);
