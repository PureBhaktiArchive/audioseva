import { filter, pipeSync } from 'iter-ops';
import * as util from 'util';
import { objectToIterableEntries } from './iterable-helpers';

/**
 * Constructs an object that contains only those properties of `b`
 * which differ from those of `a`.
 *
 * Undefined values are skipped.
 *
 * This algorithm is used for constructing an update item for Directus.
 *
 * Inspired by https://stackoverflow.com/a/57669821/3082178
 * @param a
 * @param b
 * @returns a difference object
 */
export const getDifference = <T>(a: Partial<T>, b: Partial<T>): Partial<T> =>
  Object.fromEntries(
    pipeSync(
      objectToIterableEntries(b),
      filter(
        ([key, val]) =>
          val !== undefined &&
          // Using this utility to properly compare arrays
          !util.isDeepStrictEqual(a[key], val)
      )
    )
  ) as Partial<T>;
