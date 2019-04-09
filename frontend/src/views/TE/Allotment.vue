<template>
  <div>
    <h1>Track Editing Allotment</h1>
    <v-form @submit.stop.prevent v-if="submissionStatus !== 'complete'">
      <v-autocomplete
        v-model="allotment.trackEditor"
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

      <!-- Language -->
      <v-layout row class="py-2">
        <v-btn-toggle v-model="filter.languages" multiple>
          <v-btn flat v-for="language in languages" :key="language" :value="language">{{language}}</v-btn>
        </v-btn-toggle>
      </v-layout>

      <!-- List -->
      <v-layout row class="py-2">
        <v-btn-toggle v-model="filter.list" v-if="lists">
          <v-btn flat v-for="list in lists" :key="list" :value="list">{{list}}</v-btn>
        </v-btn-toggle>
        <p v-else>Loading lists…</p>
      </v-layout>

      <template v-if="showTasks && (tasks !== null || filter.list)">
        <template v-if="tasks">
          <template v-if="tasks.length">
            <template v-for="task in tasks">
              <div :key="task['.key']">
                <v-layout align-center wrap>
                  <v-flex :style="{ alignItems: 'center', flexWrap: 'wrap' }" shrink class="d-flex">
                    <v-checkbox
                      :style="{ flex: 'none' }"
                      v-model="allotment.tasks"
                      :value="task"
                      :loading="!tasks"
                      class="mr-2 pr-3"
                    >
                      <code slot="label">{{ task[".key"] }}</code>
                    </v-checkbox>

                    <span class="pr-3">{{ getTaskLanguages(task).join(", ")}}</span>

                    <task-definition class="pr-3" :item="task" />

                    <unwanted-parts :item="task" />
                  </v-flex>
                </v-layout>
              </div>
            </template>
          </template>
          <p v-else>No tasks in this list</p>
        </template>
        <p v-else>Loading tasks…</p>
      </template>
      <p v-else-if="!showTasks">Loading tasks</p>
      <p v-else>Choose list and language to select tasks.</p>

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
import { Component, Mixins, Watch } from "vue-property-decorator";
import _ from "lodash";
import firebase from "firebase/app";
import "firebase/database";
import "firebase/functions";

import FirebaseShallowQuery from "@/mixins/FirebaseShallowQuery";
import TaskDefinition from "@/components/TE/TaskDefinition.vue";
import UnwantedParts from "@/components/TE/UnwantedParts.vue";

@Component({
  name: "Allotment",
  components: { TaskDefinition, UnwantedParts }
})
export default class Allotment extends Mixins<FirebaseShallowQuery>(
  FirebaseShallowQuery
) {
  allotment = Allotment.initialAllotment();
  languages = ["English", "Hindi", "Bengali", "None"];
  listsBasePath = "edited";
  trackEditors: any = null;
  tasks: any[] | null = null;
  lists: any = null;
  filter = Allotment.initialFilter();
  submissionStatus: string | null = null;
  showTasks = true;

  static initialAllotment() {
    return {
      trackEditor: null,
      tasks: [],
      comment: null
    };
  }

  static initialFilter(): { languages: string[]; list: any } {
    return {
      languages: [],
      list: null
    };
  }

  async mounted() {
    this.getTrackEditors();
    this.filter.languages = this.languages;
    await this.getLists();
    if (Array.isArray(this.lists) && this.lists.length) {
      this.filter.list = this.lists[0];
    }
  }

  @Watch("allotment.assignee")
  handleAllotmentAssignee(newValue: any) {
    if (newValue === null) return;

    this.filter.languages = this.languages;
  }

  @Watch("filter", { deep: true })
  handleFilter() {
    this.showTasks = false;
    this.debouncedFilter();
  }

  getTaskLanguages(item: any) {
    return _.union(
      _.get(item, "trackEditing.chunks", []).reduce(
        (languageList: any, chunk: any) => [
          ...languageList,
          ..._.get(chunk, "contentReport.languages", [])
        ],
        []
      )
    );
  }

  debouncedFilter = _.debounce(async () => {
    this.tasks = null;
    this.allotment.tasks = [];
    if (this.filter.list === null) return;

    this.$bindAsArray(
      "tasks",
      firebase
        .database()
        .ref(`edited/${this.filter.list}`)
        .orderByChild("trackEditing/status")
        .equalTo("Spare"),
      null, // cancel callback not used
      () => this.filterSelectedTasks(this.tasks as any[])
    );
  }, 1000);

  filterSelectedTasks(tasks: any[]) {
    this.tasks = tasks.reduce((filteredItems: any[], task) => {
      const taskLanguages = this.getTaskLanguages(task);
      if (
        this.filter.languages.some(language => taskLanguages.includes(language))
      ) {
        filteredItems.push(task);
      }
      return filteredItems;
    }, []);
    this.showTasks = true;
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
    this.filter = Allotment.initialFilter();
    this.submissionStatus = null;
  }
}
</script>

<style scoped>
</style>
