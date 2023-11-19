<template>
  <div>
    <div v-if="state === State.LOADING">
      <v-progress-circular indeterminate></v-progress-circular>
    </div>
    <div v-else-if="state === State.ERROR">
      <v-alert color="warning" :value="true">
        This task is not available to you. Please contact your coordinator.
      </v-alert>
    </div>
    <v-alert
      v-else-if="!Object.keys(task).length || task['.value'] === null"
      type="warning"
    >
      The task {{ $route.params.taskId }} does not exist in the database.
    </v-alert>
    <div v-else>
      <div>
        <h1>
          Track Editing Task <br />
          {{ $route.params.taskId }} =
        </h1>
      </div>
      <article>
        <task-definition :item="task"></task-definition>
        <div :style="{ display: 'flex' }">
          <h3>Status:</h3>
          <v-chip :style="getTaskStyle(task)" class="ml-1">
            {{ task.status }}
          </v-chip>
        </div>
      </article>
      <article>
        <h3>History</h3>
        <v-timeline dense>
          <v-timeline-item
            icon="fas fa-paper-plane"
            fill-dot
            v-if="task.assignee"
          >
            <v-row justify="space-between">
              <v-col cols="12" sm="9">
                <v-row no-gutters>
                  <v-col cols="12" sm="9" class="pt-0">
                    <p class="mb-0" :style="{ wordBreak: 'break-all' }">
                      Allotted to {{ task.assignee.name }} ({{
                        task.assignee.emailAddress
                      }})
                    </p>
                  </v-col>
                  <v-col cols="12" sm="3" class="pt-0">
                    <v-btn
                      @click="onCancelClick"
                      v-if="$can('cancel', $subjects.TE.task)"
                      class="mt-0 ml-1"
                      color="error"
                      small
                      >Cancel</v-btn
                    >
                  </v-col>
                </v-row>
              </v-col>
              <v-col class="text-sm-right text-left" v-if="task.timestampGiven">
                {{ formatTimestamp(task.timestampGiven) }}
              </v-col>
            </v-row>
          </v-timeline-item>
          <template v-for="(version, key, index) in task.versions">
            <v-timeline-item
              :key="`version-${key}`"
              :icon="$vuetify.icons.values.upload"
              fill-dot
            >
              <v-row justify="space-between">
                <v-col cols="12" sm="9">
                  <p>
                    <version-download-link
                      :versionId="key"
                      :taskId="$route.params.taskId"
                    >
                      <span>Version {{ index + 1 }}</span>
                    </version-download-link>
                    uploaded
                    <template v-if="version.author">
                      by {{ version.author.name }}
                    </template>
                  </p>
                </v-col>
                <v-col class="text-right" sm="3" v-if="version.timestamp">{{
                  formatTimestamp(version.timestamp)
                }}</v-col>
              </v-row>
            </v-timeline-item>
            <v-timeline-item
              :key="`resolution-${index}`"
              :color="version.resolution.isApproved ? 'green' : 'red'"
              v-if="version.resolution"
              :icon="
                version.resolution.isApproved
                  ? $vuetify.icons.values.check
                  : $vuetify.icons.values.undo
              "
              fill-dot
            >
              <v-row justify="space-between">
                <v-col
                  cols="9"
                  sm="9"
                  :style="{ display: 'flex', alignItems: 'center' }"
                >
                  <div :style="{ width: '100%' }">
                    <template v-if="version.resolution.isApproved">
                      Approved by {{ getAuthor(version) }}
                    </template>
                    <template v-else>
                      Disapproved by {{ getAuthor(version) }}:
                      <span class="mb-0" v-if="version.resolution.feedback">
                        {{ version.resolution.feedback }}
                      </span>
                    </template>
                  </div>
                </v-col>
                <v-col
                  class="text-right"
                  cols="3"
                  sm="3"
                  v-if="version.resolution.timestamp"
                >
                  <p class="mb-0">
                    {{ formatTimestamp(version.resolution.timestamp) }}
                  </p>
                </v-col>
              </v-row>
            </v-timeline-item>
            <v-timeline-item
              v-else-if="
                index === versionsCount - 1 &&
                task.status === 'WIP' &&
                $can('resolve', $subjects.TE.task)
              "
              :key="`resolution-${key}`"
            >
              <template v-slot:icon>
                <v-avatar>
                  <img :src="currentUser.photoURL" alt="user avatar" />
                </v-avatar>
              </template>
              <v-form ref="form">
                <v-textarea
                  v-model="form.feedback"
                  outlined
                  :rules="rules"
                  label="Feed back"
                ></v-textarea>
                <div :style="{ display: 'flex' }">
                  <v-menu
                    v-model="approveConfirmation"
                    offset-x
                    :nudge-width="200"
                  >
                    <template v-slot:activator="{ on }">
                      <v-btn class="success" v-on="on"> Approve </v-btn>
                    </template>
                    <v-card>
                      <v-list>
                        <v-list-item>
                          <v-list-item-content>
                            <v-list-item-title
                              :style="{ whiteSpace: 'normal' }"
                            >
                              When you click Approve below, the file will be
                              marked as final.
                            </v-list-item-title>
                          </v-list-item-content>
                        </v-list-item>
                      </v-list>
                      <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn text @click="approveConfirmation = false">
                          Cancel
                        </v-btn>
                        <v-btn
                          color="success"
                          @click="handleSubmitForm(true, key)"
                        >
                          Approve
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-menu>
                  <v-menu
                    v-model="disapproveConfirmation"
                    offset-x
                    :nudge-width="200"
                  >
                    <template v-slot:activator="{ on }">
                      <v-btn class="error ml-2" v-on="on"> Disapprove </v-btn>
                    </template>
                    <v-card>
                      <v-list>
                        <v-list-item>
                          <v-list-item-content>
                            <v-list-item-title
                              :style="{ whiteSpace: 'normal' }"
                            >
                              When you click Disapprove below, another version
                              will be requested from Track Editor.
                            </v-list-item-title>
                          </v-list-item-content>
                        </v-list-item>
                      </v-list>
                      <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn text @click="disapproveConfirmation = false">
                          Cancel
                        </v-btn>
                        <v-btn
                          color="error"
                          @click="handleSubmitForm(false, key)"
                        >
                          Disapprove
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-menu>
                </div>
              </v-form>
            </v-timeline-item>
          </template>
        </v-timeline>
      </article>
      <v-btn v-if="$can('upload', $subjects.TE.task)" to="/te/upload">
        Upload
      </v-btn>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { mapState } from 'vuex';
import firebase from 'firebase/app';
import 'firebase/database';
import 'firebase/functions';
import _ from 'lodash';
import TaskDefinition from '@/components/TE/TaskDefinition.vue';
import TaskMixin from '@/components/TE/TaskMixin';
import FormatTime from '@/mixins/FormatTime';
import VersionDownloadLink from '@/components/TE/VersionDownloadLink.vue';

enum State {
  LOADING = 0,
  ERROR = 1,
  LOADED = 2,
}

@Component({
  name: 'Task',
  components: { TaskDefinition, VersionDownloadLink },
  computed: {
    ...mapState('user', ['currentUser']),
  },
  title: ({ $route }) => `Track Editing Task ${$route.params.taskId}`,
})
export default class Task extends Mixins<TaskMixin, FormatTime>(
  TaskMixin,
  FormatTime
) {
  task: any = {};
  State = State;
  state: State = State.LOADING;
  form = {
    isApproved: false,
    feedback: '',
  };
  rules: any[] = [];
  approveConfirmation = false;
  disapproveConfirmation = false;

  currentUser!: firebase.User;

  async mounted() {
    this.getTask();
  }

  async getTask() {
    try {
      await this.$rtdbBind(
        'task',
        firebase.database().ref(`/TE/tasks/${this.$route.params.taskId}`)
      );
      this.state = State.LOADED;
    } catch (e) {
      this.state = State.ERROR;
    }
  }

  async onCancelClick() {
    try {
      await firebase.functions().httpsCallable('TE-cancelAllotment')({
        taskId: this.task['.key'],
      });
      this.task = _.merge({}, this.task, this.cancelData());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  @Watch('form.feedback')
  resetRules() {
    this.rules = [];
  }

  activateRules() {
    this.rules = this.fieldRules;
  }

  async handleSubmitForm(isApproved = false, versionKey: string) {
    this.form.isApproved = isApproved;
    if (isApproved) {
      this.resetRules();
    } else {
      this.activateRules();
    }
    this.$nextTick(async () => {
      if ((this.$refs as any).form[0].validate()) {
        const versionToUpdate = `/TE/tasks/${this.$route.params.taskId}/versions/${versionKey}/resolution`;
        await firebase
          .database()
          .ref(versionToUpdate)
          .update({
            ...this.form,
            author: {
              uid: this.currentUser.uid,
              name: this.currentUser.displayName,
              emailAddress: this.currentUser.email,
            },
            timestamp: firebase.database.ServerValue.TIMESTAMP,
          });
      }
    });
  }

  getAuthor(version: any) {
    return _.get(version, 'resolution.author.name', '');
  }

  get fieldRules() {
    return this.form.isApproved ? [] : [(v: string) => !!v || 'Required'];
  }

  get versionsCount() {
    return this.getVersionsCount(this.task);
  }

  @Watch('form.feedback')
  handleFeedback(newValue: string) {
    if (!newValue) {
      (this.$refs as any).form[0].resetValidation();
    }
  }
}
</script>

<style scoped>
>>> .v-timeline {
  max-width: 825px;
  left: -22px;
}

>>> .v-timeline:before {
  height: 95%;
}

>>> .v-timeline .v-timeline-item__body {
  right: 12px;
}

@media screen and (min-width: 600px) {
  >>> .v-timeline:before {
    height: 94%;
  }
}
</style>
