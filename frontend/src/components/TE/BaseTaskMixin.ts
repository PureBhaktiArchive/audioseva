import { Component, Vue } from 'vue-property-decorator';

@Component
export default class BaseTaskMixin extends Vue {
  getLastVersion(task: any) {
    if (!task.versions) return null;

    const [id, lastVersion] = (Object.entries(task.versions) as {
      [key: string]: any;
    }).pop();
    return {
      id,
      ...lastVersion,
    };
  }

  getVersionsCount(task: any) {
    return task.versions ? Object.keys(task.versions).length : 0;
  }
}
