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
    <div>
      <data-table
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
      <pagination-buttons
        :previous="previousPage"
        :lastPage="page === lastPage"
        :page="page"
        :isLoading="isLoading"
        :firstPage="firstPage"
        :next="nextPage"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from "vue-property-decorator";
import DataTable from "@/components/DataTable.vue";
import TETasks from "@/mixins/TETasks";
import StatusSelector from "@/components/StatusSelector.vue";
import UsersByRole from "@/mixins/UsersByRole";
import PaginationButtons from "@/components/PaginationButtons.vue";

@Component({
  name: "Tasks",
  components: {
    DataTable,
    StatusSelector,
    PaginationButtons
  }
})
export default class Tasks extends Mixins<TETasks, UsersByRole>(
  TETasks,
  UsersByRole
) {
  mode = "coordinator";
  usersRole = "TE";

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

  async mounted() {
    this.getUsers();
    await this.firstPage();
    this.isLoading = false;
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

  @Watch("assignee", { deep: true, immediate: true })
  async handleAssignee() {
    this.setQuery();
    await this.firstPage();
  }
}
</script>

<style scoped src="./tasks.css">
</style>
