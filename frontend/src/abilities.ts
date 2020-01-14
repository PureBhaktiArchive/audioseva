import { AbilityBuilder } from "@casl/ability";
import { store } from "@/store";

export const subjects = {
  TE: {
    tasks: "TE/Tasks",
    myTasks: "TE/MyTasks",
    allot: "TE/Allot",
    task: "TE/Task"
  },
  SQR: {
    tasks: "SQR/Tasks",
    form: "SQR/Form"
  }
};

class Data {
  constructor(props: any) {
    Object.assign(this, props);
  }
}

export class SQRForm extends Data {
  static get modelName() {
    return subjects.SQR.form;
  }
}

export const SubjectsPlugin = {
  install(Vue: any) {
    Vue.prototype.$subjects = subjects;
  }
};

const hasRole = (roles: any) => {
  return store.getters["user/hasRole"](roles);
};

const handleTEPermissions = (can: any, cannot: any) => {
  if (hasRole("TE.coordinator")) {
    can("manage", subjects.TE.task);
    can("manage", subjects.TE.allot);
    can("manage", subjects.TE.tasks);
    return;
  }
  if (hasRole("TE.checker")) {
    can("resolve", subjects.TE.task);
  }
  if (hasRole("TE.editor")) {
    can("upload", subjects.TE.task);
  }
};

const handleSQRPermissions = (can: any, cannot: any) => {
  can("save", subjects.SQR.form, { isCompleted: false });
  if (hasRole("SQR.coordinator")) {
    can(["submit", "read"], subjects.SQR.form);
    can("allot", subjects.SQR.tasks);
    return;
  }

  if (hasRole("SQR.checker")) {
    can(["submit", "read"], subjects.SQR.form);
    return;
  }

  can("submit", subjects.SQR.form, { isCompleted: false });
  can("read", subjects.SQR.form, { done: false });
};

export const defineAbilities = () => {
  const { rules, can, cannot } = AbilityBuilder.extract();
  handleTEPermissions(can, cannot);
  handleSQRPermissions(can, cannot);
  return rules;
};
