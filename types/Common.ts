export interface IAssignee {
  assignee: {
    emailAddress: string;
    name: string;
  };
}

export interface IBaseAllotment extends IAssignee {
  comment: string;
  timestamp: number;
  user: string;
}

export interface IAllotment<Status> extends IAssignee {
  timestampDone: number;
  timestampGiven: number;
  status: Status;
  followUp: string;
}
