<template>
  <div>
    <header>
      <h1>Sound Quality Reporting</h1>
    </header>
    <div class="nav-wrapper">
      <!-- lists -->
      <div>
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
      </div>

      <!-- Side links -->
      <div class="d-flex" :style="{ alignItems: 'center' }">
        <router-link :style="{ padding: '0 8px' }" to="sqr/statistics">Statistics</router-link>
        <router-link to="sqr/allot">Allot</router-link>
      </div>
    </div>

    <!-- Only show table if there's at least one list available -->
    <div v-if="lists.length">
      <data-table
        :headers="headers"
        :datatableProps="{ pagination, loading: isLoadingFiles }"
        :computedValue="computedCb"
        :items="files"
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
import { Component, Vue, Watch } from "vue-property-decorator";
import _ from "lodash";
import { db } from "@/main";
import DataTable from "@/components/DataTable.vue";
import { getDayDifference, formatTimestamp } from "@/utility";

@Component({
  name: "Files.vue",
  components: {
    DataTable
  }
})
export default class Files extends Vue {
  lists: string[] = [];
  files: any[] = [];
  isLoadingLists = false;
  isLoadingFiles = false;

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
      if (dateGiven) {
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
    const response: any = await this.$http.get(
      `${process.env.VUE_APP_FIREBASE_DATABASE_URL}/files.json?shallow=true`
    );
    this.lists = Object.keys(response.body);
    this.isLoadingLists = false;
    this.handleButtonClick();
  }

  @Watch("selectedButton")
  handleButtonClick() {
    this.isLoadingFiles = true;
    this.$bindAsArray(
      "files",
      db.ref(`/files/${this.lists[this.selectedButton]}`),
      null,
      () => (this.isLoadingFiles = false)
    );
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
