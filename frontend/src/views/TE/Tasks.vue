<template>
  <div>
    <header>
      <h1>Track Editing</h1>
    </header>
    <data-table
      :headers="headers"
      :items="items"
      :computedComponent="computedComponent"
      :componentData="componentData"
      :tableRowStyle="getTaskStyle"
      :styles="styles"
      :datatableProps="datatableProps"
      :pagination.sync="pagination"
    >
      <template v-slot:table-no-data>
        <div :style="{ height: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center' }">
          <v-progress-circular color="#1867c0" indeterminate v-if="datatableProps.loading"></v-progress-circular>
          <div v-else>
            No records available
          </div>
        </div>
      </template>
    </data-table>
    <div :style="{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }">
      <v-select :style="{ width: '60px', flex: 'none' }" :items="[50, 100, 200]" @change="handlePageSizeChange" :value="50">
      </v-select>
      <v-btn :disabled="pagination.page === 1" @click="handlePreviousPage">Previous</v-btn>
      <v-btn :disabled="pagination.page === lastPageNumber" @click="handleNextPage">Next</v-btn>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import "@/styles/subtext.css";
import _ from "lodash";
import DataTable from "@/components/DataTable.vue";
import TaskDefinition from "@/components/TE/TaskDefinition.vue";
import Output from "@/components/TE/Output.vue";
import Resolution from "@/components/TE/Resolution.vue";
import DateGiven from "@/components/TE/TimestampGiven.vue";
import InlineAssignEdit from "@/components/InlineAssignEdit.vue";
import InlineSave from "@/mixins/InlineSave";
import TaskMixin from "@/components/TE/TaskMixin";
import firebase from "firebase/app";
import "firebase/database";

@Component({
  name: "Tasks",
  components: {
    TaskDefinition,
    DataTable,
    DateGiven,
    Resolution,
    InlineAssignEdit
  }
})
export default class Tasks extends Mixins<InlineSave, TaskMixin>(
  InlineSave,
  TaskMixin
) {
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
    rowsPerPage: 50
  };

  datatableProps = {
    hideActions: true,
    loading: true
  };
  currentPage: any[] = [];
  pages: any = {};
  pageSize = 51;
  lastPageNumber: number = 0;

  editEvents = {
    cancel: this.cancel,
    save: this.save
  };

  itemComparePath = ".key";

  styles = {
    ".key": {
      "font-weight-bold": true,
      "text-no-wrap": true
    },
    status: {
      caption: true
    }
  };

  computedComponent = {
    resolution: Resolution,
    output: Output,
    assignee: InlineAssignEdit,
    timestampGiven: DateGiven
  };

  componentData = {
    assignee: {
      on: { ...this.editEvents, multiSave: this.multiFieldSave },
      props: {
        cancelData: this.assigneeCancel,
        shouldCancelChange: (task: any) => task.status === "Done"
      }
    }
  };

  mounted() {
    this.loadNewPage();
  }

  assigneeCancel() {
    return {
      status: "",
      timestampGiven: "",
      assignee: {
        emailAddress: "",
        name: ""
      }
    };
  }

  private paginationHandler() {
    const entries = [...this.currentPage];
    const isLastPage = entries.length < this.pageSize;
    const id = !isLastPage ? entries.splice(0, 1)[0][".key"] : "__lastPage__";
    if (isLastPage) {
      this.lastPageNumber = this.pagination.page;
    }
    this.$set(this.pages, id, entries.reverse());
    this.$set(this.datatableProps, "loading", false);
  }

  handlePageSizeChange(newSize: number) {
    this.pageSize = newSize;
    this.pagination = {
      page: 1,
      rowsPerPage: newSize
    };
    this.pages = {};
    this.lastPageNumber = 0;
    this.currentPage = [];
    this.loadNewPage();
  }

  handlePreviousPage() {
    const currentPage = _.get(this.pagination, "page", 1);
    if (currentPage < 2) return;
    this.pagination.page = currentPage - 1;
  }

  handleNextPage() {
    const nextPage = _.get(this.pagination, "page", 0) + 1;
    const pageKeys = Object.keys(this.pages);
    this.pagination.page = nextPage;
    if (!pageKeys[nextPage - 1]) {
      this.loadNewPage();
    }
  }

  loadNewPage() {
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
      query.limitToLast(this.pageSize),
      null,
      this.paginationHandler
    );
  }

  getUpdatePath(item: any, path: any): string {
    return `/TE/tasks/${item[".key"]}`;
  }

  get items() {
    return _.flatten(_.map(this.pages, page => page));
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
</style>
