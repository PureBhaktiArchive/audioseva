/**
 * Constructs a diff-object.
 *
 * Borrowed from https://stackoverflow.com/a/57669821/3082178
 * @param a
 * @param b
 * @returns properties of `b` that differ those of `a`
 */
export const getDifference = <T>(a: Partial<T>, b: Partial<T>): Partial<T> =>
  Object.fromEntries(
    Object.entries(b).filter(([key, val]) => a[key] !== val)
  ) as Partial<T>;
