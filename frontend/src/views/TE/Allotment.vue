<template>
  <div>
    <h1>{{ $title }}</h1>
    <v-form @submit.stop.prevent v-if="submissionStatus !== 'complete'">
      <autocomplete
        v-model="allotment.assignee"
        :items="trackEditors || []"
        :loading="trackEditors === null"
        item-text="name"
        label="Select an assignee"
        persistent-hint
        :item-value="getAllotmentAssignee"
        clearable
        dense
      >
        <template slot="item" slot-scope="{ item }">
          <template v-if="typeof item !== 'object'">
            <v-list-item-content v-text="item"></v-list-item-content>
          </template>
          <template v-else>
            <v-list-item-content>
              <v-list-item-title v-html="item.name"></v-list-item-title>
              <v-list-item-subtitle
                v-html="item.emailAddress"
              ></v-list-item-subtitle>
            </v-list-item-content>
          </template>
        </template>

        <template v-slot:loading-text>
          Loading track editors
        </template>
      </autocomplete>

      <template v-if="isLoadingTasks">
        <p>Loading tasks…</p>
      </template>
      <template v-else-if="tasks.length">
        <template v-for="task in tasks">
          <div :key="task['.key']">
            <v-row align="start">
              <v-col
                cols="12"
                md="2"
                lg="2"
                xl="1"
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
                  <code slot="label">{{ task[".key"] }}</code>
                </v-checkbox>
              </v-col>
              <v-col md="9" lg="10" xl="11" class="pa-0 pl-2">
                <task-definition class="pr-3" :item="task" />
              </v-col>
            </v-row>
            <v-divider
              :style="{ borderColor: '#9a9a9a' }"
              class="my-1 py-1"
            ></v-divider>
          </div>
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
import { Component, Vue } from "vue-property-decorator";
import firebase from "firebase/app";
import "firebase/database";
import "firebase/functions";

import TaskDefinition from "@/components/TE/TaskDefinition.vue";
import Autocomplete from "@/components/Autocomplete.vue";

@Component({
  name: "Allotment",
  components: { TaskDefinition, Autocomplete },
  title: "Track Editing Allotment"
})
export default class Allotment extends Vue {
  allotment: any = Allotment.initialAllotment();
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
      "tasks",
      firebase
        .database()
        .ref("/TE/tasks")
        .orderByChild("status")
        .equalTo("Spare")
        .limitToFirst(50)
    );
    this.isLoadingTasks = false;
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

  getAllotmentAssignee({ emailAddress, name }: any) {
    return { emailAddress, name };
  }

  reset() {
    this.allotment = Allotment.initialAllotment();
    this.submissionStatus = null;
  }
}
</script>

<style scoped></style>
