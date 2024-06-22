/*
 * Declaring types here to access types without importing in JS files according to
 * https://docs.joshuatz.com/cheatsheets/js/jsdoc/#passing-types-around-via-typescript-files
 */

type Assignee = {
  id: string;
  emailAddress: string;
  name: string;
  location: string;
  languages: string[];
};

type Stage = {
  name: string;
  status: 'Given' | 'Done' | 'Drop';
};

type Part = {
  number: number;
  completed: boolean;
  stages: Stage[];
};

type AllotmentUnit = {
  id: number;
  languages: string[];
  duration: number;
  note?: string;
  stages: Stage[];
  parts?: Part[];
};
