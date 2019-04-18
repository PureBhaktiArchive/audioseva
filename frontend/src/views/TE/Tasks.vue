<template>
  <div>
    <header>
      <h1>Track Editing</h1>
    </header>
    <v-layout wrap>
      <v-flex xs12 sm3>
        <v-text-field
          v-model="search"
          append-icon="fa-search"
          label="Filter tasks"
          single-line
          hide-details
        ></v-text-field>
      </v-flex>
      <v-flex class="button-group" xs12 sm8 md5 lg4 align-self-end>
        <v-btn-toggle :style="{ flexWrap: 'wrap' }" v-model="selectedButton" mandatory>
          <v-btn v-for="(value, key, index) in statuses" :key="index">{{ value }}</v-btn>
        </v-btn-toggle>
      </v-flex>
      <v-flex :style="{ display: 'flex' }" md3 align-self-end>
        <template v-if="mode === 'coordinator'">
          <v-btn to="te/allot" class="mb-0">Allot</v-btn>
          <v-btn to="te/statistics" class="mb-0">Statistics</v-btn>
        </template>
        <template v-if="mode === 'assignee'">
          <v-btn to="te/upload">Upload</v-btn>
        </template>
      </v-flex>
    </v-layout>
    <data-table
      v-if="mode"
      :headers="headers"
      :items="items"
      :computedValue="computedCb"
      :computedComponent="computedComponent"
      :componentData="componentData()"
      :tableRowStyle="tableRowStyle"
      :styles="styles"
    >
    </data-table>
    <div v-else>
      Loading data
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import _ from "lodash";
import { mapActions } from "vuex";
import DataTable from "@/components/DataTable.vue";
import { formatTimestamp, getDaysPassed } from "@/utility";
import TaskDefinition from "@/components/TE/TaskDefinition.vue";
import Output from "@/components/TE/Output.vue";
import Feedback from "@/components/TE/Feedback.vue";
import UnwantedParts from "@/components/TE/UnwantedParts.vue";
import InlineAssignEdit from "@/components/InlineAssignEdit.vue";
import InlineTextEdit from "@/components/InlineTextEdit.vue";
import InlineStatusEdit from "@/components/InlineStatusEdit.vue";
import InlineSave from "@/mixins/InlineSave";
import firebase from "firebase/app";
import "firebase/database";

@Component({
  name: "Tasks",
  components: {
    TaskDefinition,
    DataTable,
    Feedback,
    InlineAssignEdit,
    InlineStatusEdit,
    InlineTextEdit,
    UnwantedParts
  },
  methods: {
    ...mapActions("user", ["getUserClaims"])
  }
})
export default class Tasks extends Mixins<InlineSave>(InlineSave) {
  mode: "coordinator" | "assignee" | null = null;
  claims: any;

  selectedButton = 0;
  search = "";
  statuses = ["All", "Spare", "Given", "Submitted", "Revise", "Done"];

  lists: any[] = [];

  itemsKey: string = "lists";

  editEvents = {
    cancel: this.cancel,
    save: this.save
  };

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

  componentData() {
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

  async mounted() {
    await this.getPageMode();
    this.getLists();
  }

  async getPageMode() {
    this.claims = await this.getUserClaims();
    if (this.claims.coordinator) {
      this.mode = "coordinator";
    } else if (this.claims.TE) {
      this.mode = "assignee";
    }
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

  assigneeCancel() {
    return {
      status: "",
      givenTimestamp: "",
      assignee: {
        emailAddress: "",
        name: ""
      }
    };
  }

  getLists() {
    const baseQuery = firebase.database().ref("/edited");
    this.$bindAsArray(
      "lists",
      this.mode === "coordinator"
        ? baseQuery
        : baseQuery
            .orderByChild("trackEditing/assignee/emailAddress")
            .equalTo(this.claims.email)
    );
  }

  getUpdatePath(item: any, path: any): string {
    return `/edited/${item[".key"]}/${path.itemPath}`;
  }

  get headers() {
    return this.mode === "coordinator"
      ? [
          { text: "Task ID", value: ".key" },
          { text: "Status", value: "trackEditing.status" },
          { text: "Assignee", value: "assignee" },
          { text: "Date Given", value: "trackEditing.givenTimestamp" },
          { text: "Days Passed", value: "daysPassed" },
          { text: "Date Done", value: "trackEditing.doneTimestamp" },
          { text: "Languages", value: "languages" },
          { text: "Task Definition", value: "taskDefinition" },
          { text: "Unwanted Parts", value: "trackEditing.unwantedParts" },
          { text: "Output", value: "output" },
          { text: "Feedback", value: "feedback" },
          { text: "Follow Up", value: "trackEditing.followUp" }
        ]
      : [
          { text: "Task ID", value: ".key" },
          { text: "Status", value: "trackEditing.status" },
          { text: "Date Given", value: "trackEditing.givenTimestamp" },
          { text: "Days Passed", value: "daysPassed" },
          { text: "Date Done", value: "trackEditing.doneTimestamp" },
          { text: "Languages", value: "languages" },
          { text: "Task Definition", value: "taskDefinition" },
          { text: "Unwanted Parts", value: "trackEditing.unwantedParts" },
          { text: "Output", value: "output" },
          { text: "Feedback", value: "feedback" }
        ];
  }

  get searchValue() {
    return this.search.toLowerCase();
  }

  searchChunks(chunks: any[]) {
    return chunks.some(chunk => this.fieldHasSearchValue(chunk, "fileName"));
  }

  fieldHasSearchValue(item: any, path: string) {
    const searchValue = _.get(item, path, "") as string;
    return searchValue.toLowerCase().includes(this.searchValue);
  }

  searchFields(item: any) {
    let matchedItem = false;
    if (
      item[".key"].toLowerCase().includes(this.searchValue) ||
      this.fieldHasSearchValue(item, "trackEditing.followUp") ||
      this.fieldHasSearchValue(item, "trackEditing.assignee.name") ||
      this.fieldHasSearchValue(item, "trackEditing.feedback") ||
      this.searchChunks(_.get(item, "trackEditing.chunks", []))
    ) {
      matchedItem = true;
    }
    return matchedItem;
  }

  get items() {
    return this.lists.filter((task: any) => {
      let hasStatus = false;
      let matchesSearch = false;
      if (this.selectedStatus === "All") {
        hasStatus = true;
      } else {
        hasStatus = this.selectedStatus === task.trackEditing.status;
      }
      if (!this.searchValue) {
        matchesSearch = true;
      } else {
        matchesSearch = this.searchFields(task);
      }
      return matchesSearch && hasStatus;
    });
  }

  get selectedStatus() {
    return this.statuses[this.selectedButton];
  }
}
</script>

<style scoped>
>>> .task-definition {
  min-width: 200px;
}

>>> th:nth-child(n + 4):nth-child(-n + 6) {
  padding: 0 6px;
}

>>> td:nth-child(n + 4):nth-child(-n + 6) {
  padding: 0 6px;
}

.button-group {
  flex-wrap: wrap;
  margin-top: 8px;
}

@media screen and (min-width: 600px) {
  .button-group {
    margin-left: 16px;
    margin-top: 0;
  }
}
</style>
