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
        :computedValue="computedCb"
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
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from "vue-property-decorator";
import _ from "lodash";
import { db } from "@/main";
import DataTable from "@/components/DataTable.vue";
import { getDayDifference, formatTimestamp } from "@/utility";
import ShallowQuery from "@/mixins/FirebaseShallowQuery";
import { IFileVueFire } from "@/types/DataTable";

@Component({
  name: "Files",
  components: {
    DataTable
  }
})
export default class Files extends Mixins<ShallowQuery>(ShallowQuery) {
  files: IFileVueFire[] = [];
  isLoadingLists = false;
  isLoadingFiles = false;
  search: string = "";
  selectedButton: number = 0;

  pagination = { rowsPerPage: -1 };

  headers = [
    { text: "Days Passed", value: "daysPassed" },
    { text: "Date Given", value: "soundQualityReporting.timestampGiven" },
    { text: "Notes", value: "notes" },
    { text: "Languages", value: "languages" },
    { text: "Status", value: "soundQualityReporting.status" },
    { text: "File Name", value: ".key" },
    { text: "Assignee", value: "soundQualityReporting.assignee.name" },
    {
      text: "Email Address",
      value: "soundQualityReporting.assignee.emailAddress"
    },
    { text: "Date Done", value: "soundQualityReporting.timestampDone" },
    { text: "Follow Up", value: "soundQualityReporting.followUp" }
  ];

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
        db.ref(`/files/${this.lists[this.selectedButton]}`),
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
