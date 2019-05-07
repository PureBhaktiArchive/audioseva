import _ from "lodash";
import moment from "moment";
import { ICount } from "@/types/DataTable";

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

const timestampFields = {
  given: "Given",
  submission: "Submitted",
  done: "Done",
  feedback: "Revise"
};

export const teBaseStatistics = () => {
  const baseStatistics: any = {};
  getLastDays(3).forEach((date: MomentDateOrString) => {
    if (typeof date === "string") {
      baseStatistics[date] = {
        Submitted: 0,
        Done: 0,
        Revise: 0,
        Given: 0
      };
    } else {
      baseStatistics[date.format("MMM DD")] = {
        Submitted: 0,
        Done: 0,
        Revise: 0,
        Given: 0
      };
    }
  });
  return baseStatistics;
};

export const teStatistics = (
  tasks: any,
  baseStatistics: any = teBaseStatistics()
) => {
  const newStatistics = { ...baseStatistics };
  const today = moment().format("MMM DD");
  return tasks.reduce((stats: any, { trackEditing }: any) => {
    Object.entries(timestampFields).forEach(
        ([timestampPrefix, timestampName]) => {
          const timestamp = trackEditing[`${timestampPrefix}Timestamp`];
          if (timestamp) {
            const timestampDate = moment(timestamp).format("MMM DD");
            const timestampKey =
                timestampDate === today ? "today" : timestampDate;
            if (stats[timestampKey])
              stats[timestampKey][timestampName] += 1;
          }
        }
    );
    return stats;
  }, newStatistics);
};

export const formatTimestamp = (value: string, item: any) => {
  const timestamp = _.get(item, value, false);
  return timestamp ? moment(timestamp).format("D.MM.YYYY") : "";
};

const taskIdPattern = "^\\w+-\\d+-\\d+";

const taskIdFormat = new RegExp(taskIdPattern);

const flacFileFormat = new RegExp(`${taskIdPattern}.flac`);

export const validateFlacFile = ({ name: fileName, type }: any) => {
  if (type !== "audio/flac") {
    throw new Error("File type must be flac");
  }
  if (!fileName.match(flacFileFormat)) {
    throw new Error("The file name does not start with task ID");
  }
  return true;
};

export const getTaskId = (fileName: string) => {
  const match = fileName.match(taskIdFormat);
  return match ? match[0] : false;
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

export const updateObject = (obj: any, field: string, value: any) => {
  return _.setWith(_.clone(obj), field, value, _.clone);
};

export const removeObjectKey = (obj: any, field: string) => {
  const newObj = { ...obj };
  const paths = field.split(".");
  paths.reduce((form: any, path: string) => {
    if (path === paths[paths.length - 1]) {
      if (Array.isArray(form)) {
        return form.splice(parseInt(path), 1);
      }
      return delete form[path];
    }
    const formData = form[path];
    if (formData && Array.isArray(formData)) {
      return (form[path] = [...formData]);
    }
    return (form[path] = { ...(formData ? formData : {}) });
  }, newObj);
  return newObj;
};
