<template>
  <div>
    <v-form @submit.stop.prevent v-if="task && submissionStatus !== 'complete'">
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
      <v-layout align-center class="pa-2">
        <v-flex>
          <code>{{ task[".key"] }}</code>
          <sound-quality-badge :task="task"></sound-quality-badge>
        </v-flex>
        <v-flex>
          <sound-issues-list :item="task"></sound-issues-list>
        </v-flex>
        <v-flex>
          <a :href="originalFile" target="_blank" rel="noopener noreferrer" v-if="originalFile">Original file</a>
          <span v-else>
            No original file
          </span>
          <span> | </span>
          <a :href="restoredFile" target="_blank" rel="noopener noreferrer" v-if="restoredFile">Restored file</a>
          <span v-else>
            No restored file
          </span>
        </v-flex>
      </v-layout>
      <v-textarea box label="Comment" v-model="allotment.comment">
      </v-textarea>
      <v-btn @click="submit">submit</v-btn>
    </v-form>
    <div v-else>
      <div v-if="submissionStatus === 'complete'">Success</div>
      <div v-else>invalid task</div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import UsersByRole from "@/mixins/UsersByRole";
import firebase from "firebase";
import fb from "@/firebaseApp";
import SoundQualityBadge from "@/components/SoundQualityBadge.vue";
import SoundIssuesList from "@/components/SE/SoundIssuesList.vue";
import { getListId } from "@/utility";

export const storage = fb.storage();

@Component({
  name: "QCAllotmentForm",
  components: { SoundIssuesList, SoundQualityBadge }
})
export default class QCAllotmentForm extends Mixins<UsersByRole>(UsersByRole) {
  usersRole = "QC";
  allotment: any = {};
  submissionStatus: any = null;
  task: any = null;
  originalFile: any = null;
  restoredFile: any = null;

  mounted() {
    this.getData();
  }

  get taskId() {
    return this.$route.params.taskId;
  }

  getTask() {
    const listId = getListId(this.taskId);
    this.$bindAsObject(
      "task",
      fb.database().ref(`sound-editing/tasks/${listId}/${this.taskId}`)
    );
  }

  baseFilePath() {
    return process.env.VUE_APP_STORAGE_ROOT_DOMAIN;
  }

  async getOriginalFile() {
    const listId = getListId(this.taskId);
    const results = await storage
      .refFromURL(
        `gs://original.${this.baseFilePath()}/source/${listId}/${
          this.taskId
        }.flac`
      )
      .getDownloadURL()
      .catch(() => {});
    this.originalFile = results || false;
  }

  async getRestoredFile() {
    const listId = getListId(this.taskId);
    const results = await storage
      .refFromURL(
        `gs://restored.${this.baseFilePath()}/${listId}/${this.taskId}.flac`
      )
      .getDownloadURL()
      .catch(() => {});
    this.restoredFile = results || false;
  }

  getData() {
    this.getUsers();
    this.getTask();
    this.getOriginalFile();
    this.getRestoredFile();
  }

  async submit() {
    const {
      assignee: { emailAddress, name },
      ...other
    } = this.allotment;
    const data = {
      assignee: {
        emailAddress,
        name
      },
      taskIds: [this.taskId],
      // @ts-ignore
      user: fb.auth().currentUser.email,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      ...other
    };
    await fb
      .database()
      .ref(`sound-editing/restoration/quality-check/allotments`)
      .push()
      .set(data);
    this.submissionStatus = "complete";
  }
}
</script>

<style scoped>
</style>
