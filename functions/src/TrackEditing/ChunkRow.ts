/*!
 * sri sri guru gauranga jayatah
 */

import { createSchema } from 'morphism';
import { DateTimeConverter } from '../DateTimeConverter';

export interface ChunkRow {
  isRestored: boolean;
  taskId: string;
  fileName: string;
  beginning: number;
  ending: number;
  continuationFrom: string;
  unwantedParts: string;
}

export const schema = createSchema<ChunkRow>({
  isRestored: ({ 'SEd?': text }) => (text ? !/^non/i.test(text) : undefined),
  taskId: 'Output File Name',
  fileName: 'File Name',
  beginning: ({ 'Beginning Time': beginning }) =>
    DateTimeConverter.humanToSeconds(beginning),
  ending: ({ 'End Time': ending }) => DateTimeConverter.humanToSeconds(ending),
  continuationFrom: 'Continuation',
  unwantedParts: 'Unwanted Parts',
});
