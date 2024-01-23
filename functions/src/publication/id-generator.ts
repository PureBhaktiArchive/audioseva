/*!
 * sri sri guru gauranga jayatah
 */

export type ExistsPredicate = (id: number) => boolean;

export function* createIdGenerator(
  exists: ExistsPredicate
): // Explicitly typing the return as a number to avoid issues on the calling side
IterableIterator<number> {
  let id = 1;
  while (true) {
    // Skipping assigned IDs
    while (exists(id)) id++;
    yield id++;
  }
}
