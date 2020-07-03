import { store } from '@/store';
import { AbilityBuilder } from '@casl/ability';

export const subjects = {
  TE: {
    tasks: 'TE/Tasks',
    myTasks: 'TE/MyTasks',
    task: 'TE/Task',
  },
  SQR: {
    tasks: 'SQR/Tasks',
    form: 'SQR/Form',
  },
};

export const SubjectsPlugin = {
  install(Vue: any) {
    Vue.prototype.$subjects = subjects;
  },
};

const hasRole = (roles: any) => {
  return store.getters['user/hasRole'](roles);
};

const handleTEPermissions = (can: any, cannot: any) => {
  if (hasRole('TE.coordinator')) {
    can('manage', subjects.TE.task);
    can('manage', subjects.TE.tasks);
  }
  if (hasRole('TE.checker')) {
    can(['resolve', 'view'], subjects.TE.task);
    can('view', subjects.TE.tasks);
  }
  if (hasRole('TE.editor')) {
    can(['upload', 'view'], subjects.TE.task);
    can('view', subjects.TE.myTasks);
  }
};

const handleSQRPermissions = (can: any, cannot: any) => {
  can('submit', subjects.SQR.form, { isMarkedDone: false });

  if (hasRole('SQR.coordinator')) {
    can('manage', subjects.SQR.form);
    can('manage', subjects.SQR.tasks);
  }

  if (hasRole('SQR.checker')) {
    can('submit', subjects.SQR.form);
  }
};

export const defineAbilities = () => {
  const { rules, can, cannot } = new AbilityBuilder();
  handleTEPermissions(can, cannot);
  handleSQRPermissions(can, cannot);
  return rules;
};
