<template>
  <div>
    <header>
      <h1>Sound Quality Reporting</h1>
    </header>
    <v-layout justify-space-between wrap>
      <v-flex d-flex align-self-center xs12 md12>
        <v-flex xs12 sm5 md3 align-self-center>
          <v-text-field
            v-model="search"
            append-icon="fa-search"
            label="Filter sound quality reporter"
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
          <router-link :style="{ padding: '0 8px' }" to="sqr/statistics">Statistics</router-link>
          <router-link to="sqr/allot">Allot</router-link>
        </v-flex>
      </v-flex>
    </v-layout>

    <!-- Only show table if there's at least one list available -->
    <div v-if="lists && lists.length">
      <data-table
        :headers="headers"
        :datatableProps="{ pagination, loading: isLoadingFiles }"
        :computedComponent="computedComponent"
        :computedValue="computedCb"
        :componentData="componentData"
        :items="items"
        :styles="{ '.key': { 'font-weight-bold': true }}"
      >
        <template slot="table-no-data">
          <div>
            <div :style="{ justifyContent: 'center' }" class="d-flex" v-if="isLoadingFiles">
              <v-progress-circular indeterminate></v-progress-circular>
            </div>
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
import { Component, Mixins, Watch } from "vue-property-decorator";
import _ from "lodash";
import DataTable from "@/components/DataTable.vue";
import { getDayDifference, formatTimestamp } from "@/utility";
import ShallowQuery from "@/mixins/FirebaseShallowQuery";
import { IFileVueFire } from "@/types/DataTable";
import InlineAssignEdit from "@/components/InlineAssignEdit.vue";
import InlineTextEdit from "@/components/InlineTextEdit.vue";
import InlineStatusEdit from "@/components/InlineStatusEdit.vue";
import InlineSave from "@/mixins/InlineSave";
import firebase from "firebase/app";
import "firebase/database";

@Component({
  name: "Files",
  components: {
    DataTable,
    InlineAssignEdit,
    InlineStatusEdit,
    InlineTextEdit
  }
})
export default class Files extends Mixins<ShallowQuery, InlineSave>(
  ShallowQuery,
  InlineSave
) {
  files: IFileVueFire[] = [];
  isLoadingLists = false;
  isLoadingFiles = false;
  search: string = "";
  selectedButton: number = 0;
  keyPath = "soundQualityReporting";
  statusItems = ["Spare", "Given", "WIP", "Done"];
  snack = false;
  snackColor = "";
  snackText = "";

  pagination = { rowsPerPage: -1 };

  headers = [
    { text: "Days Passed", value: "daysPassed" },
    { text: "Date Given", value: "soundQualityReporting.timestampGiven" },
    { text: "Notes", value: "notes" },
    { text: "Languages", value: "languages" },
    { text: "Status", value: "soundQualityReporting.status" },
    { text: "File Name", value: ".key" },
    { text: "Assignee", value: "assignee" },
    { text: "Date Done", value: "soundQualityReporting.timestampDone" },
    { text: "Follow Up", value: "soundQualityReporting.followUp" }
  ];

  editEvents = {
    cancel: this.cancel,
    save: this.save
  };

  componentData = {
    "soundQualityReporting.followUp": {
      on: { ...this.editEvents }
    },
    "soundQualityReporting.status": {
      on: { ...this.editEvents },
      props: {
        statusItems: ["Spare", "Given", "In Review", "Revise", "Done"]
      }
    },
    notes: {
      on: { ...this.editEvents }
    },
    assignee: {
      on: { ...this.editEvents },
      props: {
        keyPath: "soundQualityReporting"
      }
    }
  };

  computedComponent = {
    "soundQualityReporting.followUp": InlineTextEdit,
    "soundQualityReporting.status": InlineStatusEdit,
    notes: InlineTextEdit,
    assignee: InlineAssignEdit
  };

  computedCb = {
    daysPassed: (value: string, item: any) => {
      const dateGiven = _.get(
        item,
        "soundQualityReporting.timestampGiven",
        false
      );
      if (typeof dateGiven === "number") {
        return getDayDifference(dateGiven);
      }
      return "";
    },
    "soundQualityReporting.status": (value: string, item: any) => {
      return _.get(item, value, "Spare");
    },
    "soundQualityReporting.timestampGiven": formatTimestamp,
    "soundQualityReporting.timestampDone": formatTimestamp
  };

  async mounted() {
    this.isLoadingLists = true;
    await this.getLists();
    this.isLoadingLists = false;
    this.handleButtonClick();
  }

  @Watch("selectedButton")
  handleButtonClick() {
    this.isLoadingFiles = true;
    if (this.lists) {
      this.$bindAsArray(
        "files",
        firebase.database().ref(`/files/${this.list}`),
        null,
        () => (this.isLoadingFiles = false)
      );
    }
  }

  get items() {
    return this.files.filter((file: any) => {
      let matchesSearch = false;
      if (!this.searchValue) {
        matchesSearch = true;
      } else {
        matchesSearch = this.searchFields(file);
      }
      return matchesSearch;
    });
  }

  get list() {
    return this.lists ? this.lists[this.selectedButton] : "";
  }

  get searchValue() {
    return this.search.toLowerCase();
  }

  searchFields(item: any) {
    let matchedItem = false;
    let { soundQualityReporting: { followUp, assignee } = "" } = item;
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
    return `/files/${this.list}/${item[".key"]}/${path["itemPath"]}`;
  }
}
</script>

<style scoped>
.nav-wrapper {
  margin-bottom: 8px;
  justify-content: space-between;
  display: flex;
  flex-direction: row;
}
</style>
