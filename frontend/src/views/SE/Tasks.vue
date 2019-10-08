<template>
  <div>
    <header>
      <h1>Sound Engineering</h1>
    </header>
    <v-row justify="space-between" >
      <v-col class="d-flex" align-self="center" cols="12" md="12">
        <v-col cols="12" sm="5" md="3" align-self="center">
          <v-text-field
            v-model="search"
            append-icon="fa-search"
            label="Filter sound engineer"
            single-line
            hide-details
          ></v-text-field>
        </v-col>
        <v-col md="2" xl="4" align-self="center" :style="{ marginLeft: '20px' }">
          <div v-if="isLoadingLists">
            <div>
              <span :style="{ marginRight: '4px' }">loading lists</span>
              <v-progress-circular indeterminate :size="15" :width="2"></v-progress-circular>
            </div>
          </div>
          <v-btn-toggle v-model="selectedButton" mandatory v-else>
            <v-btn v-for="(value, key, index) in lists" :key="index">{{ value }}</v-btn>
          </v-btn-toggle>
        </v-col>
        <v-col align-self="center" :style="{ textAlign: 'right' }">
          <router-link to="se/allot">Allot</router-link>
        </v-col>
      </v-col>
    </v-row>
    <div v-if="lists.length">
      <data-table
        :computedComponent="computedComponent"
        :computedValue="computedCb"
        :componentData="componentData"
        :headers="headers"
        :items="items"
        :styles="styles"
        :datatableProps="{ loading: isLoadingTasks }"
      >
        <template slot="table-no-data">
          <div :style="{ justifyContent: 'center' }" class="d-flex" v-if="isLoadingTasks">
            <v-progress-circular indeterminate></v-progress-circular>
          </div>
        </template>
      </data-table>
    </div>
    <v-snackbar v-model="snack" :timeout="3000" :color="snackColor">
      {{ snackText }}
      <v-btn flat @click="snack = false">Close</v-btn>
    </v-snackbar>
  </div>
</template>

<script lang="ts">
import { Component, Watch, Mixins } from "vue-property-decorator";
import _ from "lodash";
import moment from "moment";
import firebase from "firebase/app";
import "firebase/database";
import DataTable from "@/components/DataTable.vue";
import SoundIssuesList from "@/components/SE/SoundIssuesList.vue";
import InlineAssignEdit from "@/components/Assignee.vue";
import InlineStatusEdit from "@/components/InlineStatusEdit.vue";
import InlineTextEdit from "@/components/InlineTextEdit.vue";
import InlineSave from "@/mixins/InlineSave";
import { ITasks } from "@/types/SE";
import { formatTimestamp, getDayDifference } from "@/utility";

@Component({
  name: "Tasks",
  components: {
    DataTable,
    SoundIssuesList,
    InlineAssignEdit,
    InlineStatusEdit,
    InlineTextEdit
  }
})
export default class Tasks extends Mixins<InlineSave>(InlineSave) {
  tasks: ITasks[] = [];
  selectedButton = 0;
  lists: string[] = [];
  statusItems = ["Spare", "Given", "In Review", "Revise", "Done"];
  search: string = "";
  keyPath: string = "restoration";
  isLoadingLists: boolean = false;
  isLoadingTasks: boolean = false;
  snack = false;
  snackColor = "";
  snackText = "";
  editEvents = {
    save: this.save,
    cancel: this.cancel
  };

  componentData = {
    "restoration.followUp": {
      on: { ...this.editEvents },
      props: {
        keyPath: this.keyPath
      }
    },
    assignee: {
      on: { ...this.editEvents },
      props: {
        keyPath: this.keyPath
      }
    },
    "restoration.status": {
      on: { ...this.editEvents },
      props: {
        keyPath: this.keyPath,
        statusItems: this.statusItems
      }
    }
  };

  computedCb = {
    duration: (value: string, item: any) => {
      return `${moment.duration(_.get(item, value), "seconds").asMinutes()}min`;
    },
    daysPassed: (vale: string, item: any) => {
      const timestamp = _.get(item, "restoration.timestampGiven", false);
      if (timestamp) {
        return getDayDifference(timestamp);
      }
    },
    "restoration.timestampGiven": formatTimestamp,
    "restoration.timestampDone": formatTimestamp
  };

  styles = {
    ".key": {
      "font-weight-bold": true,
      "text-no-wrap": true
    }
  };

  computedComponent = {
    soundIssues: SoundIssuesList,
    assignee: InlineAssignEdit,
    "restoration.status": InlineStatusEdit,
    "restoration.followUp": InlineTextEdit
  };

  headers = [
    { text: "Days passed", value: "daysPassed" },
    { text: "Date given", value: "restoration.timestampGiven" },
    { text: "Status", value: "restoration.status" },
    {
      text: "Task ID",
      value: ".key"
    },
    {
      text: "Duration",
      value: "duration"
    },
    {
      text: "Sound Issues",
      value: "soundIssues"
    },
    {
      text: "Assignee",
      value: "assignee"
    },
    { text: "Date Done", value: "restoration.timestampDone" },
    { text: "Follow Up", value: "restoration.followUp" }
  ];

  async mounted() {
    await this.fetchLists();
    this.handleButtonClick();
  }

  async fetchLists() {
    this.isLoadingLists = true;
    const response: any = await this.$http.get(
      `${
        (firebase.app().options as any).databaseURL
      }/sound-editing/tasks.json?shallow=true`
    );
    this.isLoadingLists = false;
    this.lists = Object.keys(response.body);
  }

  @Watch("selectedButton")
  handleButtonClick() {
    this.isLoadingTasks = true;
    this.$bindAsArray(
      "tasks",
      firebase
        .database()
        .ref(`sound-editing/tasks/${this.lists[this.selectedButton]}`),
      null,
      () => (this.isLoadingTasks = false)
    );
  }

  get items() {
    return this.tasks.filter((task: any) => {
      let matchesSearch = false;
      if (!this.searchValue) {
        matchesSearch = true;
      } else {
        matchesSearch = this.searchFields(task);
      }
      return matchesSearch;
    });
  }

  get searchValue() {
    return this.search.toLowerCase();
  }

  searchFields(item: any) {
    let matchedItem = false;
    let { restoration: { followUp, assignee } = "" } = item;
    if (
      item[".key"].toLowerCase().includes(this.searchValue) ||
      (followUp && followUp.toLowerCase().includes(this.searchValue)) ||
      (assignee &&
        assignee.name &&
        assignee.name.toLowerCase().includes(this.searchValue))
    ) {
      matchedItem = true;
    }
    return matchedItem;
  }

  getUpdatePath(item: any, path: any): string {
    return `sound-editing/tasks/${this.lists[this.selectedButton]}/${
      item[".key"]
    }/${path.itemPath}`;
  }
}
</script>

<style scoped>
</style>
