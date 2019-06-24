/**
 * Extract list from filename supplied as argument
 */
export const extractListFromFilename = (fileName: string): string => {
  const match = fileName.match(/^\w+(?=-)|Hi(?=\d)/i);
  if (!match) return null;

  const list = match[0].toUpperCase();
  return list === 'HI' ? 'ML1' : list;
};

export const taskIdRegex = '^[a-zA-Z]+-\\d+';
