<template>
  <div>
    <header>
      <h1>Track Editing</h1>
    </header>
    <data-table
      :headers="headers"
      :items="items"
      :computedValue="computedCb"
      :computedComponent="computedComponent"
      :componentData="componentData"
      :tableRowStyle="getTaskStyle"
      :styles="styles"
      :tdAttributes="tdAttributes"
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
import _ from "lodash";
import DataTable from "@/components/DataTable.vue";
import { formatTimestamp, getDaysPassed } from "@/utility";
import TaskDefinition from "@/components/TE/TaskDefinition.vue";
import Output from "@/components/TE/Output.vue";
import Feedback from "@/components/TE/Feedback.vue";
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
    Feedback,
    InlineAssignEdit
  }
})
export default class Tasks extends Mixins<InlineSave, TaskMixin>(
  InlineSave,
  TaskMixin
) {
  headers = [
    { text: "Task ID", value: ".key" },
    { text: "Status", value: "status" },
    { text: "Days Passed", value: "daysPassed" },
    { text: "Assignee", value: "assignee" },
    { text: "Date Given", value: "timestampGiven" },
    { text: "Date Done", value: "timestampDone" },
    { text: "Audio Chunks", value: "taskDefinition" },
    { text: "Unwanted Parts", value: "unwantedParts" },
    { text: "Output", value: "output" },
    { text: "Feedback", value: "feedback" }
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
    unwantedParts: {
      "d-none": true
    },
    status: {
      caption: true
    },
    timestampDone: {
      caption: true
    },
    timestampGiven: {
      caption: true
    },
    daysPassed: {
      caption: true
    }
  };

  computedComponent = {
    taskDefinition: TaskDefinition,
    feedback: Feedback,
    output: Output,
    assignee: InlineAssignEdit
  };

  computedCb = {
    daysPassed: getDaysPassed("timestampGiven"),
    timestampGiven: formatTimestamp,
    timestampDone: formatTimestamp
  } as { [key: string]: (value: any, item: any) => any };

  componentData = {
    assignee: {
      on: { ...this.editEvents, multiSave: this.multiFieldSave },
      props: {
        cancelData: this.assigneeCancel,
        shouldCancelChange: (task: any) => task.status === "Done"
      }
    },
    taskDefinition: {
      class: {
        "task-definition": true
      },
      props: {
        layout: {
          link: {
            xs4: true,
            sm4: true,
            md2: true,
            lg2: true,
            xl1: true
          },
          duration: {
            xs8: true,
            sm6: true,
            md3: true,
            lg3: true,
            xl1: true
          },
          unwantedParts: {
            sm12: true,
            md7: true,
            lg7: true,
            xl9: true
          }
        }
      }
    }
  };

  tdAttributes = {
    taskDefinition: {
      colspan: 2
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
