/**
 * A helper function that converts an object to an iterable of its properties
 * without creating an intermediate array, as `Object.entries` does.
 * Borrowed from https://stackoverflow.com/a/36644965/3082178
 * @param obj
 */
export function* objectToIterableEntries<T>(
  obj: Record<string, T>
): IterableIterator<readonly [string, T]> {
  for (const key in obj) yield [key, obj[key]] as const;
}
