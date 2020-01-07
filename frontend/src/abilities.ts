import { AbilityBuilder } from "@casl/ability";
import { store } from "@/store";

const tePermissions = ["TE/Task", "TE/Upload"];
const SQRPermissions = ["SQR/Allot", "SQR/Form"];

const hasRole = (roles: any) => {
  return store.getters["user/hasRole"](roles);
};

const handleTEPermissions = (can: any) => {
  if (hasRole("TE.coordinator")) {
    can("manage", tePermissions);
    return;
  }
  if (hasRole("TE.checker")) {
    can("update", tePermissions[0]);
  }
  if (hasRole("TE.editor")) {
    can("read", tePermissions[1]);
  }
};

const handleSQRPermissions = (can: any) => {
  if (hasRole("SQR.coordinator")) {
    can("manage", SQRPermissions);
    return;
  }
  if (hasRole("SQR.checker")) {
    can("update", SQRPermissions[1]);
  }
};

export const defineAbilities = () => {
  const { rules, can } = AbilityBuilder.extract();
  handleTEPermissions(can);
  handleSQRPermissions(can);
  return rules;
};
