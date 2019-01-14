<template>
  <div>
    <h1>Sound Engineering Allotment</h1>
    <v-form @submit.stop.prevent v-if="submissionStatus !== 'complete'">
      <v-autocomplete
        v-model="allotment.assignee"
        return-object
        :items="users || []"
        item-text="name"
        label="Select an assignee"
        clearable
        dense
      >
        <template slot="item" slot-scope="{ item }">
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

      <!-- Lists -->
      <v-layout class="py-2">
        <div v-if="lists">
          <v-btn-toggle v-model="selectedList" mandatory v-if="lists && lists.length">
            <v-btn flat v-for="list in lists" :key="list" :value="list">{{ list }}</v-btn>
          </v-btn-toggle>
          <p v-else-if="lists == null">Loading lists…</p>
          <p v-else-if="lists.length == 0">There is no spare file.</p>
        </div>
        <div v-else class="elevation-1 pa-1">
          <span :style="{ marginRight: '4px' }">loading lists</span>
          <v-progress-circular indeterminate :size="15" :width="2"></v-progress-circular>
        </div>
      </v-layout>

      <!-- Tasks -->
      <div v-if="isLoadingTasks">
        <v-progress-circular indeterminate></v-progress-circular>
      </div>
      <div v-else>
        <div v-if="tasks.length">
          <v-layout align-center v-for="task in tasks" :key="task['.key']">
            <div :style="{ width: '60%' }">
              <v-checkbox v-model="allotment.tasks" :value="task['.key']">
                <div slot="label">
                  <code class="mr-2">{{ task[".key"] }}</code>
                  <v-chip :color="soundQualityRatingColor[task.soundQualityRating]">
                    <span class="white--text">{{ task.soundQualityRating }}</span>
                  </v-chip>
                </div>
              </v-checkbox>
            </div>
            <div :style="{ width: '100%' }">
              <sound-issues-list :item="task"></sound-issues-list>
            </div>
          </v-layout>
        </div>
        <p v-else>no tasks</p>
      </div>

      <v-textarea v-model="allotment.comment" box label="Comment" rows="3"></v-textarea>
      <v-btn @click="allot" :loading="submissionStatus === 'inProgress'">submit</v-btn>
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
import firebase from "firebase/app";
import fb from "@/firebaseApp";
import UsersByRole from "@/mixins/UsersByRole";
import FirebaseShallowQuery from "@/mixins/FirebaseShallowQuery";
import SoundIssuesList from "@/components/SE/SoundIssuesList.vue";
import { ISoundEditingAllotment } from "@/types/Allotment";

@Component({
  name: "Allotment",
  components: { SoundIssuesList }
})
export default class Allotment extends Mixins<
  UsersByRole,
  FirebaseShallowQuery
>(UsersByRole, FirebaseShallowQuery) {
  allotment: ISoundEditingAllotment = {
    assignee: null,
    tasks: [],
    comment: ""
  };
  selectedList: string = "";
  submissionStatus: string = "";
  usersRole = "SE";
  tasks: any[] = [];
  isLoadingTasks: boolean = true;
  listsBasePath: string = "/sound-editing/tasks";

  soundQualityRatingColor = {
    Bad: "red",
    Average: "yellow",
    Good: "green"
  };

  mounted() {
    this.getUsers();
    this.fetchLists();
  }

  async fetchLists() {
    this.lists = null;
    await this.getLists();
    // set default selected list
    if (Array.isArray(this.lists) && this.lists.length) {
      this.selectedList = this.lists[0];
    } else {
      this.isLoadingTasks = false;
    }
  }

  @Watch("selectedList")
  getTasks() {
    this.isLoadingTasks = true;
    this.$bindAsArray(
      "tasks",
      fb.database().ref(`${this.listsBasePath}/${this.selectedList}`),
      null,
      () => (this.isLoadingTasks = false)
    );
  }

  async allot() {
    this.submissionStatus = "inProgress";
    const {
      assignee: { emailAddress, name },
      ...other
    } = this.allotmentt;
    const data = {
      ...other,
      assignee: {
        emailAddress,
        name
      },
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      // @ts-ignore
      user: fb.auth().currentUser.email
    };

    await fb
      .database()
      .ref("/sound-editing/restoration/allotments")
      .push()
      .set(data);
    this.submissionStatus = "complete";
  }

  reset() {
    this.allotment = { assignee: null, tasks: [], comment: "" };
    this.submissionStatus = "";
  }
}
</script>

<style scoped>
</style>
