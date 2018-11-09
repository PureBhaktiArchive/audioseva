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

export interface ICount {
  [key: string]: number;
}

export interface ISQRFile {
  status: Status;
  languages: string[];
  notes: string;
  filename: string;
  allotment: ISQRFileAllotment;
}

export interface IFileByStatus {
  list: string;
  GRAND?: number;
  WIP?: number;
  Spare?: number;
  Given?: number;
}

export interface ISpareByLanguage {
  English?: string;
  Bengali?: string;
  Hindi?: string;
}

export interface ISQRFileVueFire {
  status: Status;
  languages: string[];
  notes: string;
  [".key"]: string;
  allotment: ISQRFileAllotment;
}
