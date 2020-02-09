/*!
 * sri sri guru gauranga jayatah
 */

export interface ChunkRow {
  isRestored: boolean;
  taskId: string;
  fileName: string;
  beginning: number;
  ending: number;
  continuationFrom: string;
  unwantedParts: string;
}
