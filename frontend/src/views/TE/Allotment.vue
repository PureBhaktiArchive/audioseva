<template>
  <div>
    <h1>Track Editing Allotment</h1>
    <v-form @submit.stop.prevent v-if="submissionStatus !== 'complete'">
      <v-autocomplete
        v-model="allotment.assignee"
        :items="trackEditors || []"
        :loading="trackEditors === null"
        item-text="name"
        label="Select an assignee"
        persistent-hint
        return-object
        clearable
        dense
      >
        <template slot="item" slot-scope="{item}">
          <template v-if="typeof item !== 'object'">
            <v-list-tile-content v-text="item"></v-list-tile-content>
          </template>
          <template v-else>
            <v-list-tile-content>
              <v-list-tile-title v-html="item.name"></v-list-tile-title>
              <v-list-tile-sub-title v-html="item.emailAddress"></v-list-tile-sub-title>
            </v-list-tile-content>
          </template>
        </template>
      </v-autocomplete>

      <template v-if="isLoadingTasks">
        <p>Loading tasks…</p>
      </template>
      <template v-else-if="tasks.length">
        <template v-for="task in tasks">
          <div :key="task['.key']">
            <v-layout align-start wrap>
              <v-flex xs12 md2 lg2 xl1 :style="{ alignItems: 'center', flexWrap: 'wrap' }" shrink class="d-flex">
                <v-checkbox
                  :style="{ flex: 'none' }"
                  v-model="allotment.tasks"
                  :value="task['.key']"
                  :loading="!tasks"
                  class="mr-2 pr-3 mt-0 pt-0"
                  :hide-details="true"
                >
                  <code slot="label">{{ task[".key"] }}</code>
                </v-checkbox>
              </v-flex>
              <v-flex md9 lg10 xl11>
                <task-definition class="pr-3" :item="task" />
              </v-flex>
            </v-layout>
            <v-divider :style="{ borderColor: '#9a9a9a' }" class="my-1 py-1"></v-divider>
          </div>
        </template>
      </template>
      <p v-else>No tasks</p>

      <!-- Comment -->
      <v-textarea v-model="allotment.comment" box label="Comment" rows="3"></v-textarea>
      <!-- Buttons -->
      <v-btn @click="allot" :loading="submissionStatus === 'inProgress'">Allot</v-btn>
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
import { Component, Vue } from "vue-property-decorator";
import firebase from "firebase/app";
import "firebase/database";
import "firebase/functions";

import TaskDefinition from "@/components/TE/TaskDefinition.vue";
import UnwantedParts from "@/components/TE/UnwantedParts.vue";

@Component({
  name: "Allotment",
  components: { TaskDefinition, UnwantedParts }
})
export default class Allotment extends Vue {
  allotment = Allotment.initialAllotment();
  trackEditors: any = null;
  tasks: any[] | null = [];
  submissionStatus: string | null = null;
  isLoadingTasks = true;

  static initialAllotment() {
    return {
      assignee: null,
      tasks: [],
      comment: null
    };
  }

  async mounted() {
    this.getTrackEditors();
    this.getTasks();
  }

  async getTrackEditors() {
    const editors = await firebase
      .functions()
      .httpsCallable("User-getAssignees")({
      phase: "TE"
    });
    this.trackEditors = editors.data;
    if (this.$route.query.emailAddress) {
      this.allotment.assignee = this.trackEditors.find(
        (editor: any) => editor.emailAddress === this.$route.query.emailAddress
      );
    }
  }

  getTasks() {
    this.$bindAsArray(
      "tasks",
      firebase
        .database()
        .ref("/TE/tasks")
        .orderByChild("status")
        .equalTo("Spare")
        .limitToFirst(50),
      null,
      () => (this.isLoadingTasks = false)
    );
  }

  async allot() {
    this.submissionStatus = "inProgress";
    try {
      await firebase.functions().httpsCallable("TE-processAllotment")(
        this.allotment
      );
      this.submissionStatus = "complete";
    } catch (error) {
      alert(error.message);
      this.submissionStatus = "error";
    }
  }

  reset() {
    this.allotment = Allotment.initialAllotment();
    this.submissionStatus = null;
  }
}
</script>

<style scoped>
</style>
