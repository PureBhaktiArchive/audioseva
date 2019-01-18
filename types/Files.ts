import { IAllotment } from "./Common";

type Status = "Spare" | "Given" | "WIP" | "Done";

interface IReporting extends IAllotment<Status> {
  token: string;
}

export interface IFile {
  languages: string[];
  languagesConfirmed?: boolean;
  notes: string;
  soundQualityReporting?: IReporting;
  contentReporting?: IReporting;
}
