<template>
  <div>
    <h1>Quality Check Allotment</h1>
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
      <div class="py-2">
        <data-table
          :computedValue="computedValue"
          :computedComponent="computedComponent"
          :componentData="componentData()"
          :headers="headers"
          :items="items"
        ></data-table>
      </div>
      <v-textarea box label="Comment" v-model="allotment.comment"></v-textarea>
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
import _ from "lodash";
import firebase from "firebase";
import "firebase/auth";
import "firebase/database";
import UsersByRole from "@/mixins/UsersByRole";
import SoundQualityBadge from "@/components/SoundQualityBadge.vue";
import SoundIssuesList from "@/components/SE/SoundIssuesList.vue";
import { getListId } from "@/utility";
import DataTable from "@/components/DataTable.vue";
import FileLink from "@/components/FileLink.vue";

@Component({
  name: "QCAllotmentForm",
  components: { DataTable, SoundIssuesList, SoundQualityBadge }
})
export default class QCAllotmentForm extends Mixins<UsersByRole>(UsersByRole) {
  usersRole = "QC";
  allotment: any = {};
  submissionStatus: any = null;
  task: any = null;

  headers = [
    { text: "Task ID", value: ".key" },
    { text: "Sound Quality", value: "soundQualityRating" },
    { text: "Sound Issues", value: "soundIssuesList" },
    { text: "Rough Edited", value: "roughEdited" },
    { text: "Restored file", value: "restoredFile" }
  ];

  computedValue = {
    ".key": (value: string, item: any) => _.capitalize(_.get(item, value))
  };

  computedComponent = {
    soundIssuesList: SoundIssuesList,
    soundQualityRating: SoundQualityBadge,
    roughEdited: FileLink,
    restoredFile: FileLink
  };

  componentData() {
    return {
      roughEdited: {
        props: {
          subDomain: "rough",
          filePath: this.roughEditedFilePath()
        }
      },
      restoredFile: {
        props: {
          subDomain: "restored",
          filePath: this.restoredFilePath()
        }
      }
    };
  }

  mounted() {
    this.getData();
  }

  get taskId() {
    return this.$route.params.taskId;
  }

  get items() {
    return [this.task];
  }

  getTask() {
    const listId = getListId(this.taskId);
    this.$bindAsObject(
      "task",
      firebase.database().ref(`sound-editing/tasks/${listId}/${this.taskId}`)
    );
  }

  roughEditedFilePath() {
    return `source/${this.restoredFilePath()}`;
  }

  restoredFilePath() {
    const listId = getListId(this.taskId);
    return `${listId}/${this.taskId}`;
  }

  getData() {
    this.getUsers();
    this.getTask();
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
      user: firebase.auth().currentUser.email,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      ...other
    };
    await firebase
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
