/*
 * Declaring types here to access types without importing in JS files according to
 * https://docs.joshuatz.com/cheatsheets/js/jsdoc/#passing-types-around-via-typescript-files
 */

declare global {
  type Assignee = {
    id: string;
    emailAddress: string;
    name: string;
    location: string;
    languages: string[];
    skills: Stage[];
  };

  type Status = 'Given' | 'Done' | 'Drop';
  type Stage =
    | 'TRSC'
    | 'FC1'
    | 'TTV'
    | 'DCRT'
    | 'LANG'
    | 'FC2'
    | 'PR'
    | 'FINAL';

  type Unit = {
    duration: number;
    completed: boolean;
    latestStage: Stage;
    latestStatus: Status;
    latestAssignee: string;
  };

  type Part = Unit & {
    number: number;
  };

  type FileToAllot = Unit & {
    id: number;
    languages: string[];
    notes?: string;
    title: string;
    parts?: Part[];
  };
}
