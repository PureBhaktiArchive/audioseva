import { Component, Vue } from "vue-property-decorator";
import _ from "lodash";

@Component
export default class TaskMixin extends Vue {
  cancelData() {
    return {
      status: "Spare",
      timestampGiven: "",
      assignee: null
    };
  }

  getTaskLink(task: any) {
    return `/te/tasks/${task[".key"]}`;
  }

  getTaskStyle(task: any) {
    let backgroundColor = "inherit";
    const resolution =
      task.versions && (Object.values(task.versions).pop() as any).resolution;
    switch (task.status) {
      case "Given":
        backgroundColor = "#D9E9FF";
        break;
      case "WIP":
        if (resolution) {
          backgroundColor = "#FFFFD5";
        } else {
          backgroundColor = "#f5f5dc";
        }
        break;
      case "Done":
        backgroundColor = "#C0D890";
        break;
    }
    return {
      backgroundColor
    };
  }
}
