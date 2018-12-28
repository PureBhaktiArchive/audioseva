import { format } from "date-fns";

export const EMPTY_VALUE = "-";

interface IAudioDescription {
  beginning: string; // h:mm:ss
  ending: string; // h:mm:ss
  type: string;
  description: string;
}

/**
 * Used for Unwanted Parts and Sound Issues to create multi-line comments
 *
 */
export function formatMultilineComment(audioDescriptionList: IAudioDescription[]) {
  if (!audioDescriptionList || !audioDescriptionList.length) {
    return "-";
  }
  let multiline = "";
  audioDescriptionList.forEach((elem: IAudioDescription, index: number) => {
    multiline = multiline
    + `${elem.beginning}-${elem.ending}:${elem.type} -- ${elem.description}`
    + ((audioDescriptionList.length === (index + 1)) ? "" : "\n");
  });
  return multiline;
}

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