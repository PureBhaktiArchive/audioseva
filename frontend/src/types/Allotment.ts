interface IBaseAssignee {
  emailAddress: string;
  name: string;
}

interface IAllotmentAssignee extends IBaseAssignee {
  ".key": string;
  languages: string[];
  roles: { [key: string]: boolean };
  status: string;
}

interface IBaseAllotment {
  assignee: IAllotmentAssignee | null;
  comment: string;
}

export interface ISoundEditingAllotment extends IBaseAllotment {
  tasks: string[];
}
