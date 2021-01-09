/*!
 * sri sri guru gauranga jayatah
 */

export interface FidelityCheckRow {
  'Archive ID': number;
  'Task ID': string;
  Topics: string;
  'Suggested Title': string;
  'Date (yyyymmdd format)': string;
  Location: string;
  Category: string;
  'Lecture Language': string;
  'Srila Gurudeva Timing': number;
  'Series/Sastra Inputs': string;
  'Sound Rating': string;
  'AM/PM': string;
  // Lookup columns
  'Done files': boolean;
  // General Fidelity Check columns
  'FC Initials': string;
  'Fidelity Checked': boolean;
  'FC Date': number;
  // Light Fidelity Check columns (without topics)
  'Fidelity Checked without topics': boolean;
  'FC Date without topics': number;
  // Finalization columns
  'Ready For Archive': boolean;
  'Topics Ready': boolean;
  'Finalization Date': number;
  // Output column
  'Validation Status': string;
}
