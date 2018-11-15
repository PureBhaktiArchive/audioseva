<template>
  <div>
    <header>
      <h1>Sound Engineering</h1>
    </header>
    <div v-if="isLoadingLists">
      <div class="elevation-1 pa-1">
        <span :style="{ marginRight: '4px' }">loading lists</span>
        <v-progress-circular indeterminate :size="15" :width="2"></v-progress-circular>
      </div>
    </div>
    <div v-else>
      <v-btn-toggle v-model="selectedButton" mandatory>
        <v-btn v-for="(value, key, index) in lists" :key="index">
          {{ value }}
        </v-btn>
      </v-btn-toggle>
    </div>
    <div v-if="lists.length">
      <s-q-r-data-table
        :computedComponent="computedComponent"
        :computedValue="computedCb"
        :headers="headers"
        :items="tasks"
        :styles="styles"
        :datatableProps="{ loading: isLoadingTasks }"
      >
        <template slot="sqrNoData">
          <div :style="{ justifyContent: 'center' }" class="d-flex" v-if="isLoadingTasks">
            <v-progress-circular indeterminate></v-progress-circular>
          </div>
        </template>
      </s-q-r-data-table>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Watch, Vue } from "vue-property-decorator";
import _ from "lodash";
import moment from "moment";
import fb from "@/firebaseApp";
import SQRDataTable from "@/components/SQRDataTable.vue";
import SoundIssuesList from "@/components/SE/SoundIssuesList.vue";
import { ITasks } from "@/types/SE";
import { formatTimestamp, getDayDifference } from "@/utility";

@Component({
  name: "Tasks",
  components: { SQRDataTable, SoundIssuesList }
})
export default class Tasks extends Vue {
  tasks: ITasks[] = [];
  selectedButton = 0;
  lists: string[] = [];
  isLoadingLists: boolean = false;
  isLoadingTasks: boolean = false;

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
      "font-weight-bold": true
    }
  };

  computedComponent = {
    soundIssues: SoundIssuesList
  };

  headers = [
    { text: "Days passed", value: "daysPassed", width: 50, sortable: true },
    { text: "Date given", value: "restoration.timestampGiven", width: 100 },
    { text: "Status", value: "restoration.status", width: 50 },
    {
      text: "Task ID",
      value: ".key",
      width: 150
    },
    {
      text: "Duration",
      value: "duration",
      width: 100
    },
    {
      text: "Sound Issues",
      value: "soundIssues"
    },
    {
      text: "Assignee",
      value: "restoration.assignee.name",
      width: 100
    },
    {
      text: "Email Address",
      value: "restoration.assignee.emailAddress",
      width: 100
    },
    { text: "Date Done", value: "restoration.timestampDone", width: 100 },
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
        process.env.VUE_APP_FIREBASE_DATABASE_URL
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
      fb
        .database()
        .ref(`sound-editing/tasks/${this.lists[this.selectedButton]}`),
      null,
      () => (this.isLoadingTasks = false)
    );
  }
}
</script>

<style scoped>
</style>
