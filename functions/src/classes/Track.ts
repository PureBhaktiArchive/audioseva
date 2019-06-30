/*
 * sri sri guru gauranga jayatah
 */

import { Chunk, Resolution } from './Chunk';
import _ = require('lodash');

export class Track {
  public chunks: Chunk[] = [];

  constructor(chunks: Chunk[]) {
    this.chunks = chunks;
  }

  public get allHasResolution(): Boolean {
    return _.every(this.chunks, chunk => chunk.resolution);
  }

  public get warnings(): string[] {
    const resolutionsToKeep = [
      Resolution.Ok,
      Resolution.Reallot, //because “reallot” means that topics should be corrected, but timing is ok
    ];

    const chunksToKeep = _(this.chunks)
      .filter(chunk => resolutionsToKeep.includes(chunk.resolution))
      .sortBy(['beginning', 'ending']);

    const warnings = chunksToKeep
      .flatMap(chunk => chunk.warnings)
      .flatten()
      .value();

    /// Chunks should not overlap each other
    if (
      chunksToKeep.find(
        (chunk, index, collection) =>
          index > 0 && chunk.beginning < collection[index - 1].ending
      )
    )
      warnings.push('Chunks are overlapping');

    return warnings;
  }
}
