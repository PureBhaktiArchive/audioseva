import { IAllotment } from "./Common";

type Status = "Spare" | "Given" | "In Review" | "Revise" | "Done";

interface ITimeSpan {
  beginning: number;
  ending: number;
}

interface ISoundIssue extends ITimeSpan {
  type: string;
  description: string;
}

interface IUnwantedPart extends ITimeSpan {
  type: string;
  description: string;
}

interface IRestoration extends IAllotment<Status> {
  ["quality-check"]: {
    token?: string;
  }
}

export interface ITask {
  duration: number;
  soundIssues: ISoundIssue[];
  unwantedParts: IUnwantedPart[];
  restoration: IRestoration;
}
