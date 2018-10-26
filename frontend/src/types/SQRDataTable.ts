type Status = "Spare" | "Given" | "WIP" | "Done";

interface ISQRFileAllotment {
  dateGiven: string;
  name: string;
  emailAddress: string;
  followUp: string;
  daysPassed: string;
  devotee: string;
  dateDone: string;
}

export interface ISQRFile {
  status: Status;
  languages: string[];
  notes: string;
  [".key"]: string;
  allotment: ISQRFileAllotment;
}
