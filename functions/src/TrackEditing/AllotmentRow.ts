/*!
 * sri sri guru gauranga jayatah
 */

import { createSchema } from 'morphism';
import { AllotmentStatus } from '../Allotment';
import { Assignee } from '../Assignee';
import { DateTimeConverter } from '../DateTimeConverter';

export interface AllotmentRow {
  isRestored: boolean;
  taskId: string;
  status: AllotmentStatus;
  assignee: Assignee;
  timestampGiven: number;
}

export const schema = createSchema<AllotmentRow>({
  taskId: 'Task ID',
  isRestored: ({ 'SEd?': text }) => (text ? !/^non/i.test(text) : undefined),
  status: 'Status',
  timestampGiven: ({ 'Date Given': dateGiven }) =>
    DateTimeConverter.fromSerialDate(dateGiven).toMillis(),
  assignee: ({ Devotee: name, Email: emailAddress }) => ({
    name,
    emailAddress,
  }),
});
