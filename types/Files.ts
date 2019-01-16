import { IAssignee, ITimeStamp } from "./Common";

type Status = "Spare" | "Given" | "WIP" | "Done";

interface IReporting extends IAssignee, ITimeStamp {
  status: Status;
  followUp: string;
}

export interface IFile {
  languages: string[];
  languagesConfirmed?: boolean;
  notes: string;
  soundQualityReporting?: IReporting;
  contentReporting?: IReporting;
}
