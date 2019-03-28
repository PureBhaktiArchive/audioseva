<template>
  <div>
    <h1>TE Allotment Form</h1>
    <v-form @submit.stop.prevent v-if="submissionStatus !== 'complete'">
      <v-autocomplete
        v-model="allotment.trackEditor"
        :items="trackEditors || []"
        :loading="trackEditors === null"
        item-text="name"
        label="Select a track editor"
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

      <!-- List -->
      <v-layout row class="py-2">
        <v-btn-toggle v-model="filter.list" v-if="lists">
          <v-btn flat v-for="list in lists" :key="list" :value="list">{{list}}</v-btn>
        </v-btn-toggle>
        <p v-else>Loading lists…</p>
      </v-layout>

      <template v-if="tasks !== null || filter.list">
        <template v-if="tasks">
          <template v-if="tasks.length">
            <template v-for="task in tasks">
              <div :key="task.id">
                <v-layout align-center>
                  <v-flex md3>
                    <v-checkbox
                      :style="{ flex: 'none' }"
                      v-model="allotment.tasks"
                      :value="task"
                      :loading="!tasks"
                      class="mr-2"
                    >
                      <code slot="label">{{ tasks.id }}</code>
                    </v-checkbox>
                    <span class="badge badge-danger" v-if="task.sourceFiles.length === 0">No source files</span>
                  </v-flex>
                  <v-flex md3>
                    <span>{{ task.action }} {{ task.language }}</span>
                  </v-flex>
                  <v-flex>
                    <pre class="pa-1">{{ task.definition }}</pre>
                  </v-flex>
                </v-layout>
              </div>
            </template>
          </template>
          <p v-else>No tasks in this list</p>
        </template>
        <p v-else>Loading tasks…</p>
      </template>

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
import "firebase/functions";

@Component({
  name: "Allotment"
})
export default class Allotment extends Vue {
  allotment = {
    trackEditor: null,
    tasks: [],
    comment: null
  };
  trackEditors = null;
  tasks = null;
  lists = null;
  filter = {};
  submissionStatus = null;

  mounted() {
    this.getTrackEditors();
  }

  async getTrackEditors() {
    const editors = await firebase
      .functions()
      .httpsCallable("User-getAssignees")({
      phase: "TE"
    });
    this.trackEditors = editors.data;
    if (this.$route.query.emailAddress) {
      this.allotment.trackEditor = this.trackEditors.find(
        (editor: any) => editor.emailAddress === this.$route.query.emailAddress
      );
    }
  }

  allot() {}

  reset() {}
}
</script>

<style scoped>
</style>
