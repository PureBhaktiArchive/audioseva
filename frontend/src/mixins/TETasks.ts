import { Component, Vue } from "vue-property-decorator";

import _ from "lodash";

import { getDaysPassed, formatTimestamp } from "@/utility";
import TaskDefinition from "@/components/TE/TaskDefinition.vue";
import Output from "@/components/TE/Output.vue";
import Feedback from "@/components/TE/Feedback.vue";
import UnwantedParts from "@/components/TE/UnwantedParts.vue";
import InlineAssignEdit from "@/components/InlineAssignEdit.vue";
import InlineTextEdit from "@/components/InlineTextEdit.vue";

@Component
export default class TETasks extends Vue {
  selectedButton = 0;
  statuses = ["All", "Spare", "Given", "Submitted", "Revise", "Done"];

  styles = {
    ".key": {
      "font-weight-bold": true,
      "text-no-wrap": true
    }
  };

  computedComponent = {
    taskDefinition: TaskDefinition,
    "trackEditing.followUp": InlineTextEdit,
    "trackEditing.unwantedParts": UnwantedParts,
    feedback: Feedback,
    output: Output,
    assignee: InlineAssignEdit
  };

  computedCb = {
    daysPassed: getDaysPassed("trackEditing.givenTimestamp"),
    "trackEditing.givenTimestamp": formatTimestamp,
    "trackEditing.doneTimestamp": formatTimestamp,
    languages: (value, item) => {
      const languages = _.get(item, "trackEditing.chunks", []).reduce(
        (languageList: any, chunk: any) => [
          ...languageList,
          ..._.get(chunk, "contentReport.languages", [])
        ],
        []
      );
      return _.union(languages).join(", ");
    }
  } as { [key: string]: (value: any, item: any) => any };

  get componentData() {
    return {
      "trackEditing.followUp": {
        on: { ...this.editEvents }
      },
      "trackEditing.unwantedParts": {
        props: {
          soundIssuesKey: "unwantedParts"
        }
      },
      output: {
        on: { ...this.editEvents, multiSave: this.multiFieldSave },
        props: {
          mode: this.mode
        }
      },
      assignee: {
        on: { ...this.editEvents },
        props: {
          keyPath: "trackEditing",
          cancelData: this.assigneeCancel,
          shouldCancelChange: (task: any) => task.trackEditing.status === "Done"
        }
      },
      taskDefinition: {
        class: {
          "task-definition": true
        }
      }
    };
  }

  get selectedStatus() {
    return this.statuses[this.selectedButton];
  }

  getUpdatePath(item: any, path: any): string {
    return `/edited/${item[".key"]}/${path.itemPath}`;
  }

  tableRowStyle(item: any) {
    let backgroundColor = "inherit";
    switch (item.trackEditing.status) {
      case "Given":
        backgroundColor = "#D9E9FF";
        break;
      case "Submitted":
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
