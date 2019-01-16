export interface IAssignee {
  assignee: {
    emailAddress: string;
    name: string;
  }
}

export interface ITimeStamp {
  timestampDone: number;
  timestampGiven: number;
}
