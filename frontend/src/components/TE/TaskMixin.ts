import { Component, Vue } from "vue-property-decorator";
import _ from "lodash";
import firebase from "firebase/app";
import "firebase/functions";

@Component
export default class TaskMixin extends Vue {
  cancelData() {
    return {
      status: "Spare",
      timestampGiven: "",
      assignee: {
        emailAddress: "",
        name: ""
      }
    };
  }

  async cancelAllotment(
    item: any,
    itemPath: string,
    paths: any,
    fieldUpdates: any
  ) {
    try {
      await firebase.functions().httpsCallable("TE-cancelAllotment")({
        taskId: item[".key"]
      });
      this.updateFields(item, fieldUpdates);
    } catch (e) {
      console.log(e.message);
    }
  }

  getTaskStyle(task: any) {
    let backgroundColor = "inherit";
    const resolution =
      task.versions &&
      _.get(task, `versions[${task.versions.length - 1}].resolution`, false);
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
