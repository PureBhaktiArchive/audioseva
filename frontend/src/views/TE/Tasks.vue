<template>
  <div>
    <header>
      <h1>Track Editing Tasks</h1>
    </header>
    <v-row align="end" >
      <v-col><v-btn class="ml-0" to="allot">Allot</v-btn></v-col>
      <v-col>
        <pagination-controls
          :pagination="pagination"
          :lastPageNumber="lastPageNumber"
          v-model="pagination.itemsPerPage"
          @input="handlePageSizeChange"
          @previousPage="handlePreviousPage"
          @nextPage="handleNextPage"
        >
        </pagination-controls>
      </v-col>
    </v-row>
    <data-table
      :headers="headers"
      :items="items"
      :tableRowStyle="getTaskStyle"
      :classes="classes"
      :options.sync="pagination"
      v-bind="datatableProps"
      @click:row="onRowClicked"
    >
      <template v-slot:.key="{ item, value }">
        <router-link :to="getTaskLink(item)">
          {{ item[".key"] }}
        </router-link>
      </template>
      <template v-slot:timestampGiven="{ item, value }">
        <date-given :item="item" :value="value"></date-given>
      </template>
      <template v-slot:assignee="{ item, value }">
        <assignee :item="item" :value="value"></assignee>
      </template>
      <template v-slot:output="{ item, value }">
        <task-output :item="item" :value="value"></task-output>
      </template>
      <template v-slot:resolution="{ item, value }">
        <resolution :item="item" :value="value"></resolution>
      </template>
      <template v-slot:table-no-data>
        <div class="no-results">
          <div v-if="!datatableProps.loading">
            No records available
          </div>
        </div>
      </template>
      <template v-slot:table-no-results>
        <div class="no-results">
          <div v-if="!datatableProps.loading">
            No records available
          </div>
        </div>
      </template>
    </data-table>
    <pagination-controls
      :pagination="pagination"
      :lastPageNumber="lastPageNumber"
      v-model="pagination.itemsPerPage"
      @input="handlePageSizeChange"
      @previousPage="handlePreviousPage"
      @nextPage="handleNextPage"
    >
    </pagination-controls>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import "@/styles/subtext.css";
import _ from "lodash";
import DataTable from "@/components/DataTable.vue";
import PaginationControls from "@/components/TE/PaginationControls.vue";
import TaskDefinition from "@/components/TE/TaskDefinition.vue";
import TaskOutput from "@/components/TE/Output.vue";
import Resolution from "@/components/TE/Resolution.vue";
import DateGiven from "@/components/DataTable/TimestampGiven.vue";
import Assignee from "@/components/Assignee.vue";
import TaskMixin from "@/components/TE/TaskMixin";
import firebase from "firebase/app";
import "firebase/database";
import "firebase/functions";

@Component({
  name: "Tasks",
  components: {
    TaskOutput,
    PaginationControls,
    TaskDefinition,
    DataTable,
    DateGiven,
    Resolution,
    Assignee
  }
})
export default class Tasks extends Mixins<TaskMixin>(TaskMixin) {
  headers = [
    { text: "Task ID", value: ".key", sortable: false },
    { text: "Status", value: "status", sortable: false },
    { text: "Date Given", value: "timestampGiven", sortable: false },
    { text: "Assignee", value: "assignee", sortable: false },
    { text: "Output", value: "output", sortable: false },
    { text: "Resolution", value: "resolution", sortable: false }
  ];

  pagination = {
    page: 1,
    itemsPerPage: 50
  };

  datatableProps = {
    hideDefaultFooter: true,
    loading: true
  };
  currentPage: any[] = [];
  pages: any = {};
  lastPageNumber: number = 0;
  flattenedPages: any[] = [];

  itemsKey = "flattenedPages";
  itemComparePath = ".key";

  classes = {
    ".key": {
      "font-weight-bold": true,
      "text-no-wrap": true
    }
  };

  mounted() {
    this.loadNewPage(1);
  }

  onRowClicked(item: any) {
    this.$router.push(`/te/tasks/${item[".key"]}`);
  }

  private paginationHandler() {
    const entries = [...this.currentPage];
    const isLastPage = entries.length < this.pagination.itemsPerPage;
    const id = !isLastPage ? entries.splice(0, 1)[0][".key"] : "__lastPage__";
    if (isLastPage) {
      this.lastPageNumber = this.pagination.page;
    }
    const reversedEntries = entries.reverse();
    this.$set(this.pages, id, reversedEntries);
    this.$set(this.datatableProps, "loading", false);
    this.flattenedPages = [...this.flattenedPages, ...reversedEntries];
  }

  handlePageSizeChange() {
    this.pagination.page = 1;
    this.pages = {};
    this.lastPageNumber = 0;
    this.currentPage = [];
    this.flattenedPages = [];
    this.loadNewPage(1);
  }

  handlePreviousPage() {
    const currentPage = _.get(this.pagination, "page", 1);
    if (currentPage < 2) return;
    this.pagination.page -= 1;
  }

  handleNextPage() {
    const nextPage = _.get(this.pagination, "page", 0) + 1;
    const pageKeys = Object.keys(this.pages);
    this.datatableProps.loading = true;
    if (!pageKeys[nextPage - 1]) {
      this.loadNewPage(nextPage);
    } else {
      this.pagination.page = nextPage;
      this.datatableProps.loading = false;
    }
  }

  loadNewPage(page: number) {
    let query: any = firebase
      .database()
      .ref("/TE/tasks")
      .orderByKey();
    const pageKeys = Object.keys(this.pages);
    if (pageKeys.length > 0) {
      query = query.endAt(_.last(pageKeys));
    }
    this.$set(this.datatableProps, "loading", true);
    this.$bindAsArray(
      "currentPage",
      query.limitToLast(this.pagination.itemsPerPage + 1),
      null,
      () => {
        this.pagination.page = page;
        this.paginationHandler();
      }
    );
  }

  get items() {
    return this.flattenedPages;
  }
}
</script>

<style scoped>
>>> th:nth-child(n + 4):nth-child(-n + 6) {
  padding: 0 6px;
}

>>> td:nth-child(n + 4):nth-child(-n + 6) {
  padding: 0 6px;
}
.no-results {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
