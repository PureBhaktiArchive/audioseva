<template>
  <div>
    <div v-if="isFetchingTask">
      <v-progress-circular indeterminate></v-progress-circular>
    </div>
    <div v-else>
      <div :style="{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start' }">
        <h1 class="d-inline" :style="{ width: 'auto' }">Track Editing Task {{ $route.params.taskId }}</h1>
        <v-chip :style="getTaskStyle(task)">{{ task.status }}</v-chip>
      </div>
      <article>
        <h3>Task Definition</h3>
        <task-definition :item="task"></task-definition>
      </article>
      <article>
        <h3>History</h3>
        <v-timeline dense>
          <v-timeline-item icon="fas fa-paper-plane" fill-dot v-if="task.assignee">
            <v-row justify="space-between" >
              <v-col cols="8" :style="{ display: 'flex', flexWrap: 'wrap' }">
                <p class="mb-0">Allotted to {{ task.assignee.name }} ({{ task.assignee.emailAddress }}).</p>
                <v-btn @click="onCancelClick" class="mt-0" color="error" small>Cancel</v-btn>
              </v-col>
              <v-col class="text-right" v-if="task.timestampGiven">
                {{ formatTimestamp(task.timestampGiven) }}
              </v-col>
            </v-row>
          </v-timeline-item>
          <template v-for="(version, key, index) in task.versions">
            <v-timeline-item :key="`version-${key}`" :icon="$vuetify.icons.upload" fill-dot>
              <v-row justify="space-between" >
                <v-col>
                  <h4 class="pr-2 d-inline">Version {{ index + 1}} uploaded:</h4>
                  <a :href="version.uploadPath">{{ task[".key"]}}</a>
                </v-col>
                <v-col class="text-right" v-if="version.timestamp" >{{ formatTimestamp(version.timestamp)}}</v-col>
              </v-row>
            </v-timeline-item>
            <v-timeline-item
              :key="`resolution-${index}`"
              :color="version.resolution.isApproved ? 'green' : 'red'"
              v-if="version.resolution"
              :icon="version.resolution.isApproved ? $vuetify.icons.check : $vuetify.icons.undo"
              fill-dot
            >
              <v-row justify="space-between" >
                <v-col cols="9" sm="9" :style="{ display: 'flex', alignItems: 'center' }">
                  <div :style="{ width: '100%' }">
                    <v-chip
                      :style="{ float: 'left' }"
                      label
                      :color="version.resolution.isApproved ? 'green' : 'red'"
                      dark
                    >
                      <span>{{ version.resolution.isApproved ? 'Approved' : 'Disapproved' }}</span>
                    </v-chip>
                    <p class="mb-0" v-if="version.resolution.feedback">{{ version.resolution.feedback }}</p>
                  </div>
                </v-col>
                <v-col class="text-right" cols="3" sm="3" v-if="version.resolution.timestamp">
                  <p class="mb-0">
                    {{ formatTimestamp(version.resolution.timestamp)}}
                  </p>
                </v-col>
              </v-row>
            </v-timeline-item>
            <v-timeline-item v-else-if="index === versionsCount - 1 && isCoordinator" :key="`resolution-${key}`">
              <template v-slot:icon>
                <v-avatar>
                  <img :src="currentUser.photoURL" alt="user avatar" />
                </v-avatar>
              </template>
              <v-form ref="form">
                <v-textarea v-model="form.feedback" outline :rules="fieldRules" label="Feed back"></v-textarea>
                <v-btn color="success" @click="handleSubmitForm(true, key)">Approve</v-btn>
                <v-btn color="error" @click="handleSubmitForm(false, key)">Disapprove</v-btn>
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

@Component({
  name: "Task",
  components: { TaskDefinition },
  computed: {
    ...mapState("user", ["currentUser"])
  },
  methods: {
    ...mapActions("user", ["getUserClaims"])
  }
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

  mounted() {
    this.getTask();
    this.checkUserClaims();
  }

  getTask() {
    this.$bindAsObject(
      "task",
      firebase.database().ref(`/TE/tasks/${this.$route.params.taskId}`),
      null,
      () => {
        this.isFetchingTask = false;
      }
    );
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
      console.log(e.message);
    }
  }

  async handleSubmitForm(isApproved = false, versionKey: string) {
    this.form.isApproved = isApproved;
    this.$nextTick(async () => {
      if ((this.$refs as any).form[0].validate()) {
        const versionToUpdate = `/TE/tasks/${
          this.$route.params.taskId
        }/versions/${versionKey}/resolution`;
        await firebase
          .database()
          .ref(versionToUpdate)
          .update({
            ...this.form,
            timestamp: firebase.database.ServerValue.TIMESTAMP
          });
      }
    });
  }

  get fieldRules() {
    return this.form.isApproved ? [] : [(v: string) => !!v || "Required"];
  }

  get versionsCount() {
    return this.task.versions ? Object.keys(this.task.versions).length : 0;
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
}

>>> .v-timeline:before {
  height: 92%;
}
</style>
