import _ from "lodash";
import moment from "moment";
import { ICount } from "@/types/DataTable";

export const filteredStatus = ["Lost", "Opted out", "Incorrect", "Duplicate"];

export function getDayDifference(date: number) {
  return moment().diff(date, "days");
}

type MomentDateOrString = string|moment.Moment

export const getLastDays = (day = 5) => {
  const days: MomentDateOrString[] = ["today"];
  const today = moment();
  let i;
  for (i = 1; i < day + 1; i++) {
    days.unshift(today.clone().subtract(i, "days"))
  }
  return days;
};

export const mergeDoneStatistics = (doneStatistics: ICount) => {
  const baseStatistics: ICount = {};
  getLastDays().forEach((date: MomentDateOrString) => {
    if (typeof date === "string") {
      baseStatistics[date] = 0;
    }
    else {
      baseStatistics[date.format("MMM DD")] = 0;
    }
  });
  return { ...baseStatistics, ...doneStatistics };
};

export const mergeLanguageStatistics = (languageStatistics: ICount) => {
  const baseLanguageStats: ICount = {
    Bengali: 0,
    English: 0,
    Hindi: 0
  };
  return { ...baseLanguageStats, ...languageStatistics };
};

export const formatTimestamp = (value: string, item: any) => {
  const timestamp = _.get(item, value, false);
  return timestamp ? moment(timestamp).format("D.MM.YYYY") : "";
};
