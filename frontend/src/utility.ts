import { ICount } from "@/types/DataTable";
import _ from "lodash";
import moment from "moment";
import { Vue } from "vue-property-decorator";

export const getProjectDomain = () => {
  return window.location.host
    .split(".")
    .slice(1)
    .join(".");
};

export function getDayDifference(date: number) {
  return moment().diff(date, "days");
}

export const getDaysPassed = (timestampPath: string) => (
  value: string,
  item: any
) => {
  const dateGiven = _.get(item, timestampPath, false);
  if (typeof dateGiven === "number") {
    return getDayDifference(dateGiven);
  }
  return "";
};

type MomentDateOrString = string | moment.Moment;

export const getLastDays = (day = 5) => {
  const days: MomentDateOrString[] = ["today"];
  const today = moment();
  let i;
  for (i = 1; i < day + 1; i++) {
    days.unshift(today.clone().subtract(i, "days"));
  }
  return days;
};

export const mergeDoneStatistics = (doneStatistics: ICount) => {
  const baseStatistics: ICount = {};
  getLastDays().forEach((date: MomentDateOrString) => {
    if (typeof date === "string") {
      baseStatistics[date] = 0;
    } else {
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

const taskIdPattern = "^\\w+-\\d+-\\d+";

const taskIdFormat = new RegExp(taskIdPattern);

export const flacFileFormat = new RegExp(`${taskIdPattern}.flac`);

export const getTaskId = (fileName: string) => {
  const match = fileName.match(taskIdFormat);
  return match?[0];
};

export const getListId = (fileId: string) => fileId.split("-")[0];

export const initialAllotment = () => ({
  assignee: null,
  files: [],
  comment: null
});

export const initialFilter = () => ({
  language: null,
  list: null
});

export const initialAllotmentFilter = (): {
  languages: string[];
  list: null;
} => ({
  languages: [] as string[],
  list: null
});

const getObject = (obj: any, path: string, defaultValue: any = {}) => {
  if (path) {
    const item = _.get(obj, path);
    if (!item) {
      // recursively make nested object reactive for state updates
      updateObject(obj, { ...getPathAndKey(path), value: defaultValue });
    }
  }
  return path ? _.get(obj, path) : obj;
};

export const getPathAndKey = (field: string) => {
  let key: any;
  let path: any;
  if (field.includes(".")) {
    const paths = field.split(".");
    key = paths.pop();
    path = paths.join(".");
  } else {
    path = "";
    key = field;
  }
  return { path, key };
};

export const updateObject = (
  obj: any,
  { path = "", key, value }: { path: string; key: any; value: any }
) => {
  let defaultValue: any = {};
  if (!isNaN(key)) {
    defaultValue = [];
  }
  return Vue.set(getObject(obj, path, defaultValue), key, value);
};

export const removeObjectKey = (
  obj: any,
  { path = "", key }: { path: string; key: any }
) => {
  return Vue.delete(getObject(obj, path), key);
};
