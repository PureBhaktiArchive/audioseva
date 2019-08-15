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
        <h3>Task definition</h3>
        <task-definition :item="task"></task-definition>
      </article>
      <versions :versions="task.versions"></versions>
      <template v-if="isCoordinator">
        <v-form @submit.prevent="handleSubmitForm" v-if="task.status === 'Uploaded'">
          <v-checkbox v-model="form.isApproved" label="Approved"></v-checkbox>
          <v-textarea v-model="form.feedback" label="Feedback" outline>
          </v-textarea>
          <v-btn :loading="isSubmitting" type="submit">Submit</v-btn>
          <p v-if="showSubmitMessage" :class="`text-${formSubmissionState}`">{{ submitMessage }}</p>
        </v-form>
      </template>
      <div v-else>
        <v-btn to="/te/upload">Upload</v-btn>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import { mapActions } from "vuex";
import firebase from "firebase/app";
import "firebase/database";
import TaskDefinition from "@/components/TE/TaskDefinition.vue";
import Versions from "@/components/TE/Versions.vue";
import TaskMixin from "@/components/TE/TaskMixin";

enum SubmissionState {
  IS_SUBMITTING = "submitting",
  SUCCESS = "success",
  ERROR = "error"
}

@Component({
  name: "Task",
  components: { TaskDefinition, Versions },
  methods: {
    ...mapActions("user", ["getUserClaims"])
  }
})
export default class Task extends Mixins<TaskMixin>(TaskMixin) {
  task!: any;
  isFetchingTask = true;
  isCoordinator = false;
  form = {
    isApproved: false
  };
  formSubmissionState!: SubmissionState;
  submitMessage = "";

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

  async handleSubmitForm() {
    this.formSubmissionState = SubmissionState.IS_SUBMITTING;
    const versionToUpdate = `/TE/tasks/${
      this.$route.params.taskId
    }/versions/${this.task.versions.length - 1}/resolution`;
    const error = await firebase
      .database()
      .ref(versionToUpdate)
      .update(this.form)
      .catch(e => e.message);
    if (error) {
      this.formSubmissionState = SubmissionState.ERROR;
      this.submitMessage = error;
    } else {
      this.formSubmissionState = SubmissionState.SUCCESS;
      this.submitMessage = "Feedback submitted";
    }
  }

  get isSubmitting() {
    return this.formSubmissionState === SubmissionState.IS_SUBMITTING;
  }

  get showSubmitMessage() {
    return [SubmissionState.ERROR, SubmissionState.SUCCESS].includes(
      this.formSubmissionState
    );
  }
}
</script>

<style scoped>
</style>
