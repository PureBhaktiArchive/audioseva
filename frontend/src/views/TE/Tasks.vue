<template>
  <div>
    <header>
      <h1>Track Editing</h1>
    </header>
    <v-layout wrap>
      <v-flex xs12 sm3>
        <v-autocomplete
          v-model="assignee"
          :items="users || []"
          :loading="users === null"
          item-text="name"
          label="Select an assignee"
          persistent-hint
          return-object
          clearable
          dense
          hide-details
        >
          <template slot="item" slot-scope="{item}">
            <template v-if="typeof item !== 'object'">
              <v-list-tile-content v-text="item"></v-list-tile-content>
            </template>
            <template v-else>
              <v-list-tile-content>
                <v-list-tile-title v-html="item.name"></v-list-tile-title>
                <v-list-tile-sub-title v-html="item.emailAddress"></v-list-tile-sub-title>
              </v-list-tile-content>
            </template>
          </template>
        </v-autocomplete>
      </v-flex>
      <v-flex class="button-group" xs12 sm8 md5 lg4 align-self-end>
        <status-selector v-model="selectedButton" />
      </v-flex>
      <v-flex :style="{ display: 'flex' }" md3 align-self-end>
        <v-btn to="te/allot" class="mb-0">Allot</v-btn>
        <v-btn to="te/statistics" class="mb-0">Statistics</v-btn>
      </v-flex>
    </v-layout>
    <data-table
      v-if="mode"
      :headers="headers"
      :items="items"
      :computedValue="computedCb"
      :computedComponent="computedComponent"
      :componentData="componentData"
      :tableRowStyle="tableRowStyle"
      :styles="styles"
      :datatableProps="datatableProps"
    >
    </data-table>
    <div v-else>
      Loading data
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from "vue-property-decorator";
import DataTable from "@/components/DataTable.vue";
import InlineSave from "@/mixins/InlineSave";
import TETasks from "@/mixins/TETasks";
import StatusSelector from "@/components/StatusSelector.vue";
import UsersByRole from "@/mixins/UsersByRole";
import firebase from "firebase/app";
import "firebase/database";

@Component({
  name: "Tasks",
  components: {
    DataTable,
    StatusSelector
  }
})
export default class Tasks extends Mixins<InlineSave, TETasks, UsersByRole>(
  InlineSave,
  TETasks,
  UsersByRole
) {
  mode = "coordinator";
  usersRole = "TE";

  assignee: any = null;

  baseQuery = firebase.database().ref("/edited");
  isLoading = true;

  headers = [
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
  ];

  tasks: any[] = [];

  itemsKey: string = "tasks";

  editEvents = {
    cancel: this.cancel,
    save: this.save
  };

  async mounted() {
    this.getUsers();
    this.getLists();
  }

  queryTasks() {
    let query: firebase.database.Reference | firebase.database.Query = this
      .baseQuery;
    if (this.assignee) {
      query = query
        .orderByChild("trackEditing/assignee/emailAddress")
        .equalTo(this.assignee.emailAddress);
    } else if (this.selectedButton) {
      query = query
        .orderByChild("trackEditing/status")
        .equalTo(this.selectedStatus);
    }
    return query;
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
    this.isLoading = true;
    this.$bindAsArray(
      "tasks",
      this.queryTasks(),
      null,
      () => (this.isLoading = false)
    );
  }

  @Watch("assignee", { deep: true, immediate: true })
  handleAssignee() {
    this.getLists();
  }

  @Watch("selectedButton", { immediate: true })
  handleSelectedButton() {
    this.getLists();
  }

  get items() {
    let tasks = this.tasks;
    if (this.assignee) {
      tasks = this.tasks.filter(
        (task: any) =>
          this.selectedStatus === "All" ||
          this.selectedStatus === task.trackEditing.status
      );
    }
    return tasks;
  }

  get datatableProps() {
    return { loading: this.isLoading };
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
