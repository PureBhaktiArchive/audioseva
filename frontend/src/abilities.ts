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
