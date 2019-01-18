export interface IAllotment<Status> {
  timestampDone: number;
  timestampGiven: number;
  assignee: {
    emailAddress: string;
    name: string;
  }
  status: Status;
  followUp: string;
}
