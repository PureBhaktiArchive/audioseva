/**
 * Fixes common human mistakes in topics formatting so that it renders correctly
 * as Markdown
 */
export const sanitizeTopics = (topics: string) =>
  topics
    // Remove original text
    .replace(/\s*ORIGINAL.*$/s, '')
    // Normalize line endings and spaces
    .replaceAll('\r', '\n')
    .replaceAll('\t', ' ')
    // Remove leading and trailing spaces, including empty lines
    .replaceAll(/^\s+/gm, '')
    .replaceAll(/\s+$/gm, '')
    // Ensure hyphen with a space in the beginning of a line
    .replaceAll(/^(-\s*)?/gm, '- ');
