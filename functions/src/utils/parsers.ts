import * as moment from 'moment';

export function spreadsheetDateFormat(date: number): string {
  if (!date) {
    return '-';
  }
  return moment(date * 1000).format('MM/DD/YYYY');
}

export function withDefault(text: string, missing: string = '') {
  return text ? text : missing;
}

export function commaSeparated(stringList: string[]) {
  return stringList.length ? stringList.join(', ') : '-';
}
