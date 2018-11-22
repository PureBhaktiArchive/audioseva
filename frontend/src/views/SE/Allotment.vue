<template>
  <div>
    <h1>Sound Engineering</h1>
    <v-form @submit.stop.prevent v-if="submissionStatus !== 'complete'">
      <v-autocomplete
        v-model="allotment.assignee"
        return-object
        :items="users"
        item-text="name"
        label="Select a user"
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

      <!-- Lists -->
      <v-layout row class="py-2">
        <v-btn-toggle v-model="selectedList" mandatory v-if="lists">
          <v-btn flat v-for="list in lists" :key="list" :value="list">{{list}}</v-btn>
        </v-btn-toggle>
        <p v-else>Loading lists…</p>
      </v-layout>

      <!-- Tasks -->
      <template v-if="lists.length">
        <template v-if="tasks.length">
          <v-layout align-center v-for="task in tasks" :key="task['.key']">
            <div :style="{ width: '60%' }">
              <v-checkbox v-model="allotment.tasks" :value="task['.key']">
                <div slot="label">
                  <v-badge :color="soundQualityRating[task.soundQualityRating]">
                    <div slot="badge"></div>
                    <code>{{ task[".key"] }}</code>
                  </v-badge>
                </div>
              </v-checkbox>
            </div>
            <div :style="{ width: '100%' }">
              <sound-issues-list :item="task"></sound-issues-list>
            </div>
          </v-layout>
        </template>
        <template v-else>
          <div>
            <div v-if="isLoadingTasks">loading tasks</div>
            <div v-else>no tasks for this list</div>
          </div>
        </template>
      </template>
      <template v-else>
        <div>
          <div v-if="isLoadingLists">loading lists</div>
          <div v-else>no lists</div>
        </div>
      </template>
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
import firebase from "firebase";
import fb from "@/firebaseApp";
import UsersByRole from "@/mixins/UsersByRole";
import Lists from "@/mixins/Lists";
import SoundIssuesList from "@/components/SE/SoundIssuesList.vue";

@Component({
  name: "Allotment",
  components: { SoundIssuesList }
})
export default class Allotment extends Mixins<UsersByRole, Lists>(
  UsersByRole,
  Lists
) {
  allotment = {
    assignee: {},
    tasks: [],
    comment: ""
  };
  selectedList: string = "";
  submissionStatus: string = "";
  usersRole = "SE";
  tasks: any[] = [];
  isLoadingLists: boolean = false;
  isLoadingTasks: boolean = false;
  listsBasePath: string = "/sound-editing/tasks";

  soundQualityRating = {
    Bad: "red",
    Average: "yellow",
    Good: "green"
  };

  mounted() {
    this.getUsers();
    this.fetchLists();
  }

  async fetchLists() {
    this.isLoadingLists = true;
    await this.getLists();
    this.isLoadingLists = false;
    // set default selected list
    if (this.lists.length) {
      this.selectedList = this.lists[0];
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
    } = this.allotment;
    const data = {
      ...other,
      assignee: {
        emailAddress,
        name
      },
      timestamp: firebase.database.ServerValue.TIMESTAMP,
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
