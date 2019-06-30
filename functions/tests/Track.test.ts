/*
 * sri sri guru gauranga jayatah
 */

import { Chunk, Resolution } from '../src/classes/Chunk';
import { Track } from '../src/classes/Track';

describe('Track validation', () => {
  test('Correct', () => {
    const track = new Track([
      new Chunk({
        fileName: 'BR-08B',
        beginning: 0,
        ending: 1328,
        continuationFrom: 'BR-08A',
        resolution: Resolution.Ok,
      }),
      new Chunk({
        fileName: 'BR-08B',
        beginning: 1329,
        ending: 1893,
        resolution: Resolution.Ok,
      }),
    ]);

    expect(track.warnings).toEqual([]);
  });

  test('Overlapping', () => {
    const track = new Track([
      new Chunk({
        fileName: 'BR-08B',
        beginning: 0,
        ending: 1328,
        continuationFrom: 'BR-08A',
        resolution: Resolution.Ok,
      }),
      new Chunk({
        fileName: 'BR-08B',
        beginning: 1327,
        ending: 1893,
        resolution: Resolution.Ok,
      }),
    ]);

    expect(track.warnings).toEqual(['Chunks are overlapping']);
  });

  test('From chunks', () => {
    const track = new Track([
      new Chunk({
        fileName: 'BR-08B',
        beginning: 0,
        ending: 0,
        continuationFrom: 'BR-08A',
        resolution: Resolution.Ok,
      }),
      new Chunk({
        fileName: 'BR-08B',
        resolution: Resolution.Ok,
      }),
    ]);

    expect(track.warnings).toEqual([
      'Beginning is equal to Ending',
      'Beginning is incorrect',
      'Ending is incorrect',
    ]);
  });
});
