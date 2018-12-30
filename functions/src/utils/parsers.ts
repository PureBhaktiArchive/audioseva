import { format } from "date-fns";

export const EMPTY_VALUE = "-";

export function createUpdateLink(token: string): string {
  return `http://purebhakti.info/audioseva/form/sound-quality-report?token=${token}`;
}

export function spreadsheetDateFormat(date: number): string {
  if (!date) {
    return "-";
  }
  return format(date*1000, "MM/DD/YYYY");
}

export function withDefault(text: string, missing: string = EMPTY_VALUE) {
  return text ? text : missing;
}

export function commaSeparated(stringList: string[]) {
  return stringList.length ? stringList.join(", ") : "-";
}