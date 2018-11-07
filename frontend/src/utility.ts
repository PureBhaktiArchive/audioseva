import moment from "moment";

export function getDayDifference(date: number) {
  return moment().diff(date, "days");
}
