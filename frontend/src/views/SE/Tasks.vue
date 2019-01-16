<template>
  <div>
    <header>
      <h1>Sound Engineering</h1>
    </header>
    <v-layout justify-space-between wrap>
      <v-flex d-flex align-self-center xs12 md12>
        <v-flex xs12 sm5 md3 align-self-center>
          <v-text-field
            v-model="search"
            append-icon="fa-search"
            label="Filter sound engineer"
            single-line
            hide-details
          ></v-text-field>
        </v-flex>
        <v-flex md2 xl4 align-self-center :style="{ marginLeft: '20px' }">
          <div v-if="isLoadingLists">
            <div>
              <span :style="{ marginRight: '4px' }">loading lists</span>
              <v-progress-circular indeterminate :size="15" :width="2"></v-progress-circular>
            </div>
          </div>
          <v-btn-toggle v-model="selectedButton" mandatory v-else>
            <v-btn v-for="(value, key, index) in lists" :key="index">{{ value }}</v-btn>
          </v-btn-toggle>
        </v-flex>
        <v-flex align-self-center :style="{ textAlign: 'right' }">
          <router-link to="se/allot">Allot</router-link>
        </v-flex>
      </v-flex>
    </v-layout>
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
import { Component, Watch, Vue } from "vue-property-decorator";
import _ from "lodash";
import moment from "moment";
import fb from "@/firebaseApp";
import DataTable from "@/components/DataTable.vue";
import SoundIssuesList from "@/components/SE/SoundIssuesList.vue";
import InlineAssignEdit from "@/components/InlineAssignEdit.vue";
import InlineStatusEdit from "@/components/InlineStatusEdit.vue";
import InlineTextEdit from "@/components/InlineTextEdit.vue";
import { ITaskVueFire } from "@/types/SE";
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
export default class Tasks extends Vue {
  tasks: ITaskVueFire[] = [];
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
    'restoration.followUp': {
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
    'restoration.status': {
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
    'restoration.status': InlineStatusEdit,
    'restoration.followUp': InlineTextEdit
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

  save(
    item: any,
    path: any,
    updates: any,
    { itemPath, newValue }: { [key: string]: any } = { itemPath: false }
  ) {
    this.snack = true;
    this.snackColor = "success";
    this.snackText = "Data saved";

    // firebase Path URL to save data in database.
    const refPath = `sound-editing/tasks/${this.lists[this.selectedButton]}/${item[".key"]}/${path.itemPath}`;

    // manual update state if component can't use v-model
    if (itemPath) {
      this.$set(
        this.items,
        this.items.findIndex(i => i[".key"] === item[".key"]),
        _.setWith(_.clone(item), itemPath, newValue, _.clone)
      );
    }

    fb.database()
      .ref(refPath)
      .set(updates);
  }

  cancel() {
    this.snack = true;
    this.snackColor = "error";
    this.snackText = "Canceled";
  }
}
</script>

<style scoped>
</style>
