interface IBaseAssignee {
  emailAddress: string;
  name: string;
}

interface IBaseAllotment {
  assignee: IBaseAssignee | null;
  comment: string;
}

export interface ISoundEditingAllotment extends IBaseAllotment {
  taskIds: string[];
}
