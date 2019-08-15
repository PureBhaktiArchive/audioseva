import { Component, Vue } from "vue-property-decorator";

@Component
export default class TaskMixin extends Vue {
  getTaskStyle(task: any) {
    let backgroundColor = "inherit";
    switch (task.status) {
      case "Given":
        backgroundColor = "#D9E9FF";
        break;
      case "Uploaded":
        backgroundColor = "#f5f5dc";
        break;
      case "Revise":
        backgroundColor = "#FFFFD5";
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
