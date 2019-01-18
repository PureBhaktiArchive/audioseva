import { IAllotment } from "./Common";

type Status = "Spare" | "Given" | "In Review" | "Revise" | "Done";

interface Issue {
  beginning: number;
  ending: number;
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
  soundIssues: Issue[];
  unwantedParts: Issue[];
  restoration: IRestoration;
}
