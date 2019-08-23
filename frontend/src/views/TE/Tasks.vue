<template>
  <div>
    <header>
      <h1>Track Editing</h1>
    </header>
    <data-table
      :headers="headers"
      :items="items"
      :computedValue="computedCb"
      :computedComponent="computedComponent"
      :componentData="componentData"
      :tableRowStyle="getTaskStyle"
      :styles="styles"
      :tdAttributes="tdAttributes"
    >
    </data-table>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from "vue-property-decorator";
import DataTable from "@/components/DataTable.vue";
import { formatTimestamp, getDaysPassed } from "@/utility";
import TaskDefinition from "@/components/TE/TaskDefinition.vue";
import Output from "@/components/TE/Output.vue";
import Feedback from "@/components/TE/Feedback.vue";
import InlineAssignEdit from "@/components/InlineAssignEdit.vue";
import InlineSave from "@/mixins/InlineSave";
import TaskMixin from "@/components/TE/TaskMixin";
import firebase from "firebase/app";
import "firebase/database";

@Component({
  name: "Tasks",
  components: {
    TaskDefinition,
    DataTable,
    Feedback,
    InlineAssignEdit
  }
})
export default class Tasks extends Mixins<InlineSave, TaskMixin>(
  InlineSave,
  TaskMixin
) {
  headers = [
    { text: "Task ID", value: ".key" },
    { text: "Status", value: "status" },
    { text: "Days Passed", value: "daysPassed" },
    { text: "Assignee", value: "assignee" },
    { text: "Date Given", value: "timestampGiven" },
    { text: "Date Done", value: "timestampDone" },
    { text: "Audio Chunks", value: "taskDefinition" },
    { text: "Unwanted Parts", value: "unwantedParts" },
    { text: "Output", value: "output" },
    { text: "Feedback", value: "feedback" }
  ];

  selectedButton = 0;
  statuses = ["All", "Spare", "Given", "Uploaded", "Revise", "Done"];

  editEvents = {
    cancel: this.cancel,
    save: this.save
  };

  itemComparePath = ".key";

  styles = {
    ".key": {
      "font-weight-bold": true,
      "text-no-wrap": true
    },
    unwantedParts: {
      "d-none": true
    },
    status: {
      caption: true
    },
    timestampDone: {
      caption: true
    },
    timestampGiven: {
      caption: true
    },
    daysPassed: {
      caption: true
    }
  };

  computedComponent = {
    taskDefinition: TaskDefinition,
    feedback: Feedback,
    output: Output,
    assignee: InlineAssignEdit
  };

  computedCb = {
    daysPassed: getDaysPassed("timestampGiven"),
    timestampGiven: formatTimestamp,
    timestampDone: formatTimestamp
  } as { [key: string]: (value: any, item: any) => any };

  componentData = {
    assignee: {
      on: { ...this.editEvents, multiSave: this.multiFieldSave },
      props: {
        cancelData: this.assigneeCancel,
        shouldCancelChange: (task: any) => task.status === "Done"
      }
    },
    taskDefinition: {
      class: {
        "task-definition": true
      },
      props: {
        layout: {
          link: {
            xs4: true,
            sm4: true,
            md2: true,
            lg2: true,
            xl1: true
          },
          duration: {
            xs8: true,
            sm6: true,
            md3: true,
            lg3: true,
            xl1: true
          },
          unwantedParts: {
            sm12: true,
            md7: true,
            lg7: true,
            xl9: true
          }
        }
      }
    }
  };

  tdAttributes = {
    taskDefinition: {
      colspan: 2
    }
  };

  assigneeCancel() {
    return {
      status: "",
      timestampGiven: "",
      assignee: {
        emailAddress: "",
        name: ""
      }
    };
  }

  getTasks() {
    this.$bindAsArray("tasks", firebase.database().ref("/TE/tasks"));
  }

  getUpdatePath(item: any, path: any): string {
    return `/TE/tasks/${item[".key"]}`;
  }

  get items() {
    return this.tasks;
  }

  @Watch("selectedStatus", { immediate: true })
  handleSelectedStatus() {
    this.getTasks();
  }

  get selectedStatus() {
    return this.statuses[this.selectedButton];
  }
}
</script>

<style scoped>
>>> th:nth-child(n + 4):nth-child(-n + 6) {
  padding: 0 6px;
}

>>> td:nth-child(n + 4):nth-child(-n + 6) {
  padding: 0 6px;
}
</style>
