<template>
  <div>
    <div v-if="isFetchingTask">
      <v-progress-circular indeterminate></v-progress-circular>
    </div>
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
                      }}).
                    </p>
                  </v-col>
                  <v-col cols="12" sm="3" class="pt-0">
                    <v-btn
                      @click="onCancelClick"
                      v-if="isCoordinator"
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
                  <h4 class="pr-2 d-inline">
                    Version {{ index + 1 }} uploaded:
                  </h4>
                  <version-download-link
                    :versionId="key"
                    :taskId="$route.params.taskId"
                  >
                    {{ task[".key"] }}
                  </version-download-link>
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
                      Approved by {{ currentUser.displayName }}
                    </template>
                    <template v-else>
                      Disapproved by {{ currentUser.displayName }}:
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
              v-else-if="index === versionsCount - 1 && isCoordinator"
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
                  <v-btn
                    color="success"
                    class="mx-2"
                    @click="handleSubmitForm(true, key)"
                    >Approve</v-btn
                  >
                  <v-btn color="error" @click="handleSubmitForm(false, key)"
                    >Disapprove</v-btn
                  >
                </div>
              </v-form>
            </v-timeline-item>
          </template>
        </v-timeline>
      </article>
      <v-btn v-if="!isCoordinator" to="/te/upload">Upload</v-btn>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from "vue-property-decorator";
import { mapState, mapActions } from "vuex";
import firebase from "firebase/app";
import "firebase/database";
import "firebase/functions";
import _ from "lodash";
import TaskDefinition from "@/components/TE/TaskDefinition.vue";
import TaskMixin from "@/components/TE/TaskMixin";
import FormatTime from "@/mixins/FormatTime";
import VersionDownloadLink from "@/components/TE/VersionDownloadLink.vue";

@Component({
  name: "Task",
  components: { TaskDefinition, VersionDownloadLink },
  computed: {
    ...mapState("user", ["currentUser"])
  },
  methods: {
    ...mapActions("user", ["getUserClaims"])
  },
  title: ({ $route }) => `Track Editing Task ${$route.params.taskId}`
})
export default class Task extends Mixins<TaskMixin, FormatTime>(
  TaskMixin,
  FormatTime
) {
  task: any = {};
  isFetchingTask = true;
  isCoordinator = false;
  form = {
    isApproved: false,
    feedback: ""
  };
  rules: any[] = [];

  currentUser!: firebase.User;
  getUserClaims!: any;

  mounted() {
    this.getTask();
    this.checkUserClaims();
  }

  async getTask() {
    await this.$rtdbBind(
      "task",
      firebase.database().ref(`/TE/tasks/${this.$route.params.taskId}`)
    );
    this.isFetchingTask = false;
  }

  async checkUserClaims() {
    const claims = await this.getUserClaims();
    this.isCoordinator = claims.coordinator;
  }

  async onCancelClick() {
    try {
      await firebase.functions().httpsCallable("TE-cancelAllotment")({
        taskId: this.task[".key"]
      });
      this.task = _.merge({}, this.task, this.cancelData());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e.message);
    }
  }

  @Watch("form.feedback")
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
              emailAddress: this.currentUser.email
            },
            timestamp: firebase.database.ServerValue.TIMESTAMP
          });
      }
    });
  }

  get fieldRules() {
    return this.form.isApproved ? [] : [(v: string) => !!v || "Required"];
  }

  get versionsCount() {
    return this.getVersionsCount(this.task);
  }

  @Watch("form.feedback")
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
