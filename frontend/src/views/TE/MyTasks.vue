<template>
  <div>
    <header>
      <h1>My Tasks</h1>
    </header>
    <v-layout wrap>
      <v-flex class="button-group" xs12 sm8 md5 lg4 align-self-end>
        <status-selector v-model="selectedButton" />
      </v-flex>
      <v-flex :style="{ display: 'flex' }" md3 align-self-end>
        <v-btn to="upload">Upload</v-btn>
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
import { Component, Mixins } from "vue-property-decorator";
import { mapState } from "vuex";

import DataTable from "@/components/DataTable.vue";
import PaginationButtons from "@/components/PaginationButtons.vue";
import StatusSelector from "@/components/StatusSelector.vue";
import TETasks from "@/mixins/TETasks";

@Component({
  name: "MyTasks",
  computed: {
    ...mapState("user", ["currentUser"])
  },
  components: { PaginationButtons, DataTable, StatusSelector }
})
export default class MyTasks extends Mixins<TETasks>(TETasks) {
  mode = "assignee";

  headers = [
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

  async mounted() {
    this.assignee = {
      emailAddress: this.currentUser.email
    };

    this.setQuery();
    await this.firstPage();
  }
}
</script>

<style scoped src="./tasks.css">
</style>
