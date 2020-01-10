import { AbilityBuilder } from "@casl/ability";
import { store } from "@/store";

const TESubjects = [
  "TE/Task",
  "TE/Upload",
  "TE/Allot",
  "TE/Tasks",
  "TE/MyTasks"
];
const SQRSubjects = ["SQR/Allot", "SQR/UpdateDone"];

const subjects = [...TESubjects, ...SQRSubjects].reduce(
  (permissions, permission) => {
    permissions[permission] = permission;
    return permissions;
  },
  {} as { [key: string]: string }
);

const hasRole = (roles: any) => {
  return store.getters["user/hasRole"](roles);
};

const handleTEPermissions = (can: any) => {
  if (hasRole("TE.coordinator")) {
    can("manage", TESubjects);
    return;
  }
  if (hasRole("TE.checker")) {
    can("resolve", subjects["TE/Task"]);
  }
  if (hasRole("TE.editor")) {
    can("upload", subjects["TE/Upload"]);
  }
};

const handleSQRPermissions = (can: any) => {
  if (hasRole("SQR.coordinator")) {
    can("manage", SQRSubjects);
    return;
  }
  if (hasRole("SQR.checker")) {
    can("submit", subjects["SQR/UpdateDone"]);
  }
};

export const defineAbilities = () => {
  const { rules, can } = AbilityBuilder.extract();
  handleTEPermissions(can);
  handleSQRPermissions(can);
  return rules;
};
