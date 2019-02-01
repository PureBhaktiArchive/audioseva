import { IAllotment } from "./Common";

type Status = "Spare" | "Given" | "In Review" | "Revise" | "Done";

interface ITimeSpan {
  beginning: number;
  ending: number;
}

interface ISoundIssue extends ITimeSpan {
  entireFile?: boolean;
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
  soundQualityRating: "Good" | "Average" | "Bad";
  chunks: IChunk[];
}

export interface IChunk {
  beginning: number;
  ending: number;
  continuationFrom?: string;
  continuationTo?: string;
  contentReporting?: any;
  importTimestamp?: number;
  processingResolution?: any;
  taskId?: string;
}
