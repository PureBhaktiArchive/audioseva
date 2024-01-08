/**
 * A helper function to avoid using `Object.entries` and creating a duplicate data structure.
 * Borrowed from https://stackoverflow.com/a/36644965/3082178
 * @param obj
 */
export function* makeIterable<T, I = readonly [string, T]>(
  obj: Record<string, T>,
  transformation?: (key: string, value: T) => I
) {
  for (const key in obj)
    yield transformation
      ? transformation(key, obj[key])
      : ([key, obj[key]] as const);
}
