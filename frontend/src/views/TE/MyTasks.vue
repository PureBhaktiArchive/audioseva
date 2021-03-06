<template>
  <div>
    <header>
      <h1>{{ $title }}</h1>
    </header>
    <v-row>
      <v-col>
        <v-btn to="/te/upload">Upload</v-btn>
      </v-col>
    </v-row>
    <data-table
      v-bind="datatableProps"
      :headers="headers"
      :tableRowStyle="getTaskStyle"
      :items="activeTasks"
      :classes="classes"
    >
      <!-- eslint-disable vue/no-parsing-error -->
      <template v-slot:.key="{ item }">
        <router-link :to="getTaskLink(item)">
          {{ item['.key'] }}
        </router-link>
      </template>
      <template v-slot:timestampGiven="{ item, value }">
        <timestamp-given :item="item" :value="value"></timestamp-given>
      </template>
      <template v-slot:output="{ item, value }">
        <task-output :item="item" :value="value"></task-output>
      </template>
      <template v-slot:resolution="{ item, value }">
        <resolution
          :item="item"
          :value="value"
          :showReviewButton="false"
        ></resolution>
      </template>
    </data-table>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import _ from 'lodash';
import firebase from 'firebase/app';
import 'firebase/database';
import { mapState } from 'vuex';
import '@/styles/subtext.css';

import DataTable from '@/components/DataTable.vue';
import TimestampGiven from '@/components/DataTable/TimestampGiven.vue';
import TaskOutput from '@/components/TE/Output.vue';
import Resolution from '@/components/TE/Resolution.vue';
import TaskMixin from '@/components/TE/TaskMixin';

const ranks: any = {
  Given: 3,
  WIP: 2,
  Done: 1,
};

@Component({
  name: 'MyTasks',
  computed: {
    ...mapState('user', ['currentUser']),
  },
  components: {
    DataTable,
    TimestampGiven,
    Resolution,
    TaskOutput,
  },
  title: 'My Tasks',
})
export default class MyTasks extends Mixins<TaskMixin>(TaskMixin) {
  tasks: any[] = [];
  currentUser!: firebase.User;
  isLoadingTasks = false;
  headers = [
    { text: 'Task ID', value: '.key', sortable: false },
    { text: 'Status', value: 'status', sortable: false },
    { text: 'Date Given', value: 'timestampGiven', sortable: false },
    { text: 'Output', value: 'output', sortable: false },
    { text: 'Resolution', value: 'resolution', sortable: false },
  ];

  datatableProps = {
    footerProps: {
      itemsPerPageOptions: [50, 100, 200],
    },
    customSort: (items: any[]) => {
      return _.orderBy(
        items,
        [(o) => ranks[o.status], 'timestampGiven'],
        ['desc', 'desc']
      );
    },
    loading: true,
  };

  classes = {
    '.key': {
      'font-weight-bold': true,
      'text-no-wrap': true,
    },
  };

  mounted() {
    this.getTasks();
  }

  async getTasks() {
    await this.$rtdbBind(
      'tasks',
      firebase
        .database()
        .ref('/TE/tasks')
        .orderByChild('assignee/emailAddress')
        .equalTo(this.currentUser.email)
    );
    this.datatableProps.loading = false;
  }

  get activeTasks() {
    return this.tasks.filter((task) => ['Given', 'WIP'].includes(task.status));
  }
}
</script>

<style scoped></style>
