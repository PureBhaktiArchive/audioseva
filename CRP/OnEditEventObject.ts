export interface OnEditEventObject {
  authMode: GoogleAppsScript.Script.AuthMode;
  oldValue: unknown;
  range: GoogleAppsScript.Spreadsheet.Range;
  source: GoogleAppsScript.Spreadsheet.Spreadsheet;
  triggerUid: string;
  user: GoogleAppsScript.Base.User;
  value: unknown;
}
