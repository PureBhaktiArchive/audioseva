import { IFile } from "../../../types/Files";

export interface ICount {
  [key: string]: number;
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

export interface IFileVueFire extends IFile {
  [".key"]: string;
}
