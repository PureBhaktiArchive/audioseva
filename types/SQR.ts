import { IBaseAllotment } from "./Common";
import { ISoundIssue, IUnwantedPart } from "./SE";

export interface ISQRRawAllotment extends IBaseAllotment {
  files: string[]
}

export interface ISQRSubmission {
  unwantedParts: IUnwantedPart[];
  soundIssues: ISoundIssue[];
  duration: {
    beginning: any;
    ending: any;
  };
  soundQualityRating: "Good" | "Average" | "Bad" | "Inaudible" | "Blank";
  comments: string;
  created: number;
  changed: number;
  completed?: number;
}
