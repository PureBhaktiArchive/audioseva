<template>
  <div>
    <header>
      <h1>My Tasks</h1>
    </header>
    <v-layout>
      <v-flex>
        <v-btn to="/te/upload">Upload</v-btn>
      </v-flex>
    </v-layout>
    <data-table
      :componentData="componentData"
      :datatableProps="datatableProps"
      :headers="headers"
      :tableRowStyle="getTaskStyle"
      :items="tasks"
      :styles="styles"
      :computedComponent="computedComponent"
      :pagination.sync="pagination"
    >
    </data-table>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import _ from "lodash";
import firebase from "firebase/app";
import "firebase/database";
import { mapState } from "vuex";
import "@/styles/subtext.css";

import DataTable from "@/components/DataTable.vue";
import TimestampGiven from "@/components/DataTable/TimestampGiven.vue";
import Output from "@/components/TE/Output.vue";
import Resolution from "@/components/TE/Resolution.vue";
import Link from "@/components/DataTable/Link.vue";
import TaskMixin from "@/components/TE/TaskMixin";

const ranks: any = {
  Given: 3,
  WIP: 2,
  Done: 1
};

@Component({
  name: "MyTasks",
  computed: {
    ...mapState("user", ["currentUser"])
  },
  components: {
    DataTable,
    Link,
    TimestampGiven,
    Resolution,
    Output
  }
})
export default class MyTasks extends Mixins<TaskMixin>(TaskMixin) {
  tasks: any[] = [];
  isLoadingTasks = false;
  headers = [
    { text: "Task ID", value: ".key", sortable: false },
    { text: "Status", value: "status", sortable: false },
    { text: "Date Given", value: "timestampGiven", sortable: false },
    { text: "Output", value: "output", sortable: false },
    { text: "Resolution", value: "resolution", sortable: false }
  ];

  datatableProps = {
    rowsPerPageItems: [50, 100, 200],
    customSort: (items: any[]) => {
      return _.orderBy(
        items,
        [o => ranks[o.status], "timestampGiven"],
        ["desc", "desc"]
      );
    },
    loading: true
  };

  pagination = {
    rowsPerPage: 50,
    page: 1,
    descending: true
  };

  styles = {
    ".key": {
      "font-weight-bold": true,
      "text-no-wrap": true
    }
  };

  computedComponent = {
    ".key": Link,
    timestampGiven: TimestampGiven,
    resolution: Resolution,
    output: Output
  };

  componentData = {
    resolution: {
      props: {
        showReviewButton: false
      }
    },
    ".key": {
      props: {
        to: (item: any) => `/te/tasks/${item[".key"]}`,
        linkText: (item: any) => item[".key"]
      }
    }
  };

  mounted() {
    this.getTasks();
  }

  getTasks() {
    this.$bindAsArray(
      "tasks",
      firebase
        .database()
        .ref("/TE/tasks")
        .orderByChild("assignee/emailAddress")
        .equalTo(this.currentUser.email),
      null,
      () => {
        this.datatableProps.loading = false;
      }
    );
  }
}
</script>

<style scoped>
</style>
