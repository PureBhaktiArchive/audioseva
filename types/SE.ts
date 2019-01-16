import { IAssignee, ITimeStamp } from "./Common";

interface Issue {
  beginning: number;
  ending: number;
  type: string;
  description: string;
}

interface IRestoration extends IAssignee, ITimeStamp {
  status: "Spare" | "Given" | "In Review" | "Revise" | "Done";
  followUp?: string;
  ["quality-check"]: {
    token?: string;
  }
}

export interface ITask {
  duration: number;
  soundIssues: Issue[];
  unwantedParts: Issue[];
  restoration: IRestoration;
}
