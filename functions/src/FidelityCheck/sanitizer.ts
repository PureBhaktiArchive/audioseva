/**
 * Fixes common human mistakes in topics formatting so that it renders correctly
 * as Markdown
 */
export const sanitizeTopics = (topics: string) =>
  topics
    .replaceAll('\r\n', '\n')
    .replaceAll('\t', ' ')
    // Remove spaces in the beginning of the line
    .replaceAll(/^\s*/gm, '')
    // Add hyphen in the beginning of the line
    .replaceAll(/^(?!-)/gm, '-')
    // Remove extra spaces after hyphen
    .replaceAll(/(?<=^-\s)\s*/gm, '')
    // Add space after hyphen in the beginning of the line
    .replaceAll(/(?<=^-)(?!\s)/gm, ' ')
    // Remove original text kept in the end of the cell
    .replace(/\n*\s*ORIGINAL.*$/s, '');
