import BaseTaskMixin from '@/components/TE/BaseTaskMixin';
import { Component, Mixins } from 'vue-property-decorator';

@Component
export default class TaskMixin extends Mixins<BaseTaskMixin>(BaseTaskMixin) {
  cancelData() {
    return {
      status: 'Spare',
      timestampGiven: '',
      assignee: null,
    };
  }

  getTaskLink(task: any) {
    return `/te/tasks/${task['.key']}`;
  }

  getTaskStyle(task: any) {
    let backgroundColor = 'inherit';
    const lastVersion = this.getLastVersion(task);
    const resolution = lastVersion && lastVersion.resolution;
    switch (task.status) {
      case 'Given':
        backgroundColor = '#D9E9FF';
        break;
      case 'WIP':
        if (resolution) {
          backgroundColor = '#FFFFD5';
        } else {
          backgroundColor = '#f5f5dc';
        }
        break;
      case 'Done':
        backgroundColor = '#C0D890';
        break;
    }
    return {
      backgroundColor,
    };
  }
}
