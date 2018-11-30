import _ from "lodash";
import moment from "moment";
import { ICount } from "@/types/DataTable";

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

const taskIdPattern = "\\w+-\\d+-\\d+";

const taskId = new RegExp(taskIdPattern);

const flacFileFormat = new RegExp(`${taskIdPattern}\\w+.flac`);

export const validateFlacFile = ({ name: fileName, type }: any) => {
  const isValidFormat = fileName.match(flacFileFormat);
  if (isValidFormat && type === "audio/flac") return isValidFormat;
  throw new Error(`
  A valid file is of type flac and 
  follows the pattern of 'wordsornumbers-numbers-numbersOptionalWords'
  `);
};

export const getTaskId = (fileName: string) => {
  const match = fileName.match(taskId);
  return match ? match[0] : false;
};
