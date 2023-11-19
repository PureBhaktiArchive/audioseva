<template>
  <div>
    <h1>{{ $title }}</h1>
    <v-form @submit.stop.prevent v-if="submissionStatus !== 'complete'">
      <!-- Pass in placeholder messages so message slot shows -->
      <assignee-selector
        v-model="allotment.assignee"
        :items="trackEditors || []"
        :loading="trackEditors === null"
        :messages="['placeholder']"
        item-text="name"
        :item-value="getAllotmentAssignee"
      >
        <template v-slot:selection="{ item }">
          {{ item.name }}
        </template>
        <template v-slot:message>
          <div
            :style="{ visibility: allotment.assignee ? 'visible' : 'hidden' }"
          >
            <v-chip :color="getTaskStyle({ status: 'Given' }).backgroundColor">
              Given
              <v-avatar right>
                <v-progress-circular
                  size="24"
                  indeterminate
                  v-if="isLoadingAssigneeTasks"
                ></v-progress-circular>
                <template v-else>
                  {{ assigneeTasksStats.Given }}
                </template>
              </v-avatar>
            </v-chip>
            <v-chip :color="getTaskStyle({ status: 'WIP' }).backgroundColor">
              WIP
              <v-avatar right>
                <v-progress-circular
                  size="24"
                  indeterminate
                  v-if="isLoadingAssigneeTasks"
                ></v-progress-circular>
                <template v-else>
                  {{ assigneeTasksStats.WIP }}
                </template>
              </v-avatar>
            </v-chip>
          </div>
        </template>
      </assignee-selector>

      <template v-if="isLoadingTasks">
        <p>Loading tasks…</p>
      </template>
      <template v-else-if="tasks.length">
        <template v-for="(groupedTask, name) in groupedTasks">
          <template v-for="task in groupedTask">
            <v-row align="start" :key="task['.key']">
              <v-col
                cols="12"
                :style="{ alignItems: 'center', flexWrap: 'wrap' }"
                class="d-flex shrink"
              >
                <v-checkbox
                  :style="{ flex: 'none' }"
                  v-model="allotment.tasks"
                  :value="task['.key']"
                  :loading="!tasks"
                  class="mr-2 pr-3 mt-0 pt-0"
                  :hide-details="true"
                >
                  <div slot="label">
                    <code class="mr-2">
                      {{ task['.key'] }}
                    </code>
                    <restored-chip
                      :isRestored="task.isRestored"
                    ></restored-chip>
                  </div>
                </v-checkbox>
                {{ getTaskSummary(task) }}
              </v-col>
            </v-row>
          </template>
          <v-divider
            :key="name"
            :style="{ borderColor: '#9a9a9a' }"
            class="my-1 py-1"
          ></v-divider>
        </template>
      </template>
      <p v-else>No tasks</p>

      <!-- Comment -->
      <v-textarea
        v-model="allotment.comment"
        filled
        label="Comment"
        rows="3"
      ></v-textarea>
      <!-- Buttons -->
      <v-btn @click="allot" :loading="submissionStatus === 'inProgress'"
        >Allot</v-btn
      >
    </v-form>
    <v-alert
      v-else
      :value="submissionStatus === 'complete'"
      type="success"
      transition="scale-transition"
    >
      <h4 class="alert-heading">Allotted succesfully</h4>
      <p class="mb-0">
        <v-btn @click="reset">Make another allotment</v-btn>
      </p>
    </v-alert>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import firebase from 'firebase/app';
import 'firebase/database';
import 'firebase/functions';
import _ from 'lodash';

import TaskMixin from '@/components/TE/TaskMixin';
import TaskDefinition from '@/components/TE/TaskDefinition.vue';
import AssigneeSelector from '@/components/AssigneeSelector.vue';
import RestoredChip from '@/components/TE/RestoredChip.vue';

@Component({
  name: 'Allotment',
  components: { AssigneeSelector, TaskDefinition, RestoredChip },
  title: 'Track Editing Allotment',
})
export default class Allotment extends Mixins<TaskMixin>(TaskMixin) {
  allotment: any = Allotment.initialAllotment();
  trackEditors: any = null;
  tasks: any[] | null = [];
  submissionStatus: string | null = null;
  isLoadingTasks = true;
  isLoadingAssigneeTasks = false;
  assigneeTasks: { [key: string]: any }[] = [];

  static initialAllotment() {
    return {
      assignee: null,
      tasks: [],
      comment: null,
    };
  }

  async mounted() {
    this.getTrackEditors();
    this.getTasks();
  }

  @Watch('allotment.assignee')
  async handleAssigneeChange(newVal: any, oldVal: any) {
    if (!newVal) {
      return;
    }
    if (newVal && newVal.emailAddress) {
      if (oldVal && oldVal.emailAddress === newVal.emailAddress) {
        return;
      }
      this.isLoadingAssigneeTasks = true;
      await this.$rtdbBind(
        'assigneeTasks',
        firebase
          .database()
          .ref('/TE/tasks')
          .orderByChild('assignee/emailAddress')
          .equalTo(this.allotment.assignee.emailAddress)
      );
      this.isLoadingAssigneeTasks = false;
    }
  }

  async getTrackEditors() {
    const editors = await firebase
      .functions()
      .httpsCallable('User-getAssignees')({
      phase: 'TE',
    });
    this.trackEditors = editors.data;
    if (this.$route.query.emailAddress) {
      this.allotment.assignee = this.getAllotmentAssignee(
        this.trackEditors.find(
          (editor: any) =>
            editor.emailAddress === this.$route.query.emailAddress
        )
      );
    }
  }

  async getTasks() {
    await this.$rtdbBind(
      'tasks',
      firebase
        .database()
        .ref('/TE/tasks')
        .orderByChild('status')
        .equalTo('Spare')
        .limitToFirst(50)
    );
    this.isLoadingTasks = false;
  }

  async allot() {
    this.submissionStatus = 'inProgress';
    try {
      await firebase.functions().httpsCallable('TE-processAllotment')(
        this.allotment
      );
      this.submissionStatus = 'complete';
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
      this.submissionStatus = 'error';
    }
  }

  getAllotmentAssignee({ emailAddress, name }: any) {
    return { emailAddress, name };
  }

  getTaskSummary(task: any) {
    if (!task.chunks) return '';
    const summaryStats = task.chunks.reduce(
      (stats: { [x: string]: number | undefined }, chunk: any) => {
        if (stats[chunk.fileName] === undefined) {
          stats[chunk.fileName] = 0;
        }
        if (chunk.unwantedParts) {
          stats[chunk.fileName] += chunk.unwantedParts.split('\n').length;
        }
        return stats;
      },
      {}
    );
    return Object.entries(summaryStats).reduce(
      (summary: string, [fileName, count]: any) => {
        if (summary) {
          summary += ` + ${fileName} (${count} UP)`;
        } else {
          summary += `${fileName} (${count} UP)`;
        }
        return summary;
      },
      ''
    );
  }

  get assigneeTasksStats() {
    return this.assigneeTasks.reduce(
      (stats, task) => {
        if (['WIP', 'Given'].includes(task.status)) {
          stats[task.status] += 1;
        }
        return stats;
      },
      { WIP: 0, Given: 0 }
    );
  }

  reset() {
    this.allotment = Allotment.initialAllotment();
    this.submissionStatus = null;
  }

  get groupedTasks() {
    if (!this.tasks) return {};
    return _.groupBy(this.tasks, (task) =>
      _.split(task['.key'], '-', 2).join('-')
    );
  }
}
</script>

<style scoped></style>
