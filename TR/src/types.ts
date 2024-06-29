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
  type Stage = 'TRSC' | 'FC1' | 'TTV' | 'DCRT' | 'LANG' | 'FC2' | 'FINAL';

  type Part = {
    number: number;
    duration: number;
    completed: boolean;
    latestStage: Stage;
    latestStatus: Status;
    latestAssignee: string;
  };

  type FileToAllot = {
    id: number;
    languages: string[];
    duration: number;
    note?: string;
    latestStage: Stage;
    latestStatus: Status;
    latestAssignee: string;
    parts?: Part[];
  };
}
