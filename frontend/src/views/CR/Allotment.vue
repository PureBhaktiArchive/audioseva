/*
 * sri sri guru gauranga jayatah
 */
<template>
  <div>
    <h1>Content Reporting Allotment</h1>
    <v-form @submit.stop.prevent v-if="submissionStatus != 'complete'">
      <v-autocomplete
        v-model="allotment.assignee"
        :items="users || []"
        :hint="usersHint"
        :loading="users === null"
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
        <v-btn-toggle v-model="filesSelector.language">
          <v-btn flat v-for="language in languages" :key="language" :value="language">{{language}}</v-btn>
        </v-btn-toggle>
      </v-layout>
      <!-- List -->
      <v-layout row class="py-2">
        <v-btn-toggle v-model="filesSelector.list" v-if="lists">
          <v-btn flat v-for="list in lists" :key="list" :value="list">{{list}}</v-btn>
        </v-btn-toggle>
        <p v-else>Loading lists…</p>
      </v-layout>
      <!-- Files -->
      <template v-if="files != null">
        <template v-if="files">
          <template v-if="files.length > 0">
            <v-layout align-center v-for="file in files" :key="file.filename">
              <v-checkbox v-model="allotment.files" :value="file.filename" :loading="!files">
                <code slot="label">{{ file.filename }}</code>
              </v-checkbox>
              <span>{{ file.notes }}</span>
            </v-layout>
          </template>
          <p v-else>No spare files found for selected language in {{filesSelector.list}} list.</p>
        </template>
        <p v-else>Loading files…</p>
      </template>
      <p v-else>Choose list and language to select files.</p>
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
      <h4 class="alert-heading">Lectures allotted successfully</h4>
      <p class="mb-0">
        <v-btn @click="reset">Make another allotment</v-btn>
      </p>
    </v-alert>
  </div>
</template>

<style>
#files pre {
  background-color: #f9f2f4;
  color: #c7254e;
}
</style>

<script>
import fb from "@/firebaseApp";
import firebase from "firebase";
import _ from "lodash";

const filteredStatus = ["Lost", "Opted out", "Incorrect", "Duplicate"];

export default {
  name: "CRAllotment",
  data: () => ({
    users: null,
    languages: ["English", "Hindi", "Bengali", "None"],
    lists: null,
    files: null,
    filesSelector: {
      language: null,
      list: null,
      count: 20
    },
    allotment: {
      assignee: null,
      files: [],
      comment: null
    },
    submissionStatus: null
  }),
  mounted: async function() {
    // Getting users
    this.$bindAsArray(
      "users",
      fb
        .database()
        .ref("/users")
        .orderByChild("roles/CR")
        .equalTo(true),
      null,
      () => {
        this.users = this.users.reduce(
          (filteredUsers, { status, emailAddress, ...other }) => {
            if (!filteredStatus.includes(status)) {
              const user = { status, emailAddress, ...other };
              filteredUsers.push(user);              
              if (this.$route.query.emailAddress === emailAddress) {
                this.allotment.assignee = user;  
              }
            }
            return filteredUsers;
          },
          []
        );
      }
    );

    // Getting lists
    const response = await this.$http.get(
      `${process.env.VUE_APP_FIREBASE_DATABASE_URL}/files.json?shallow=true`
    );
    this.lists = Object.keys(response.body);
  },
  computed: {
    usersHint: function() {
      const languages = _.get(this.allotment, "assignee.languages", {});
      const hint = Object.keys(languages).join(", ");
      return hint ? `Languages: ${hint}` : "";
    }
  },
  methods: {
    async allot() {
      const {
        assignee: { name, emailAddress },
        ...other
      } = this.allotment;

      this.submissionStatus = "inProgress";
      const allotmentData = {
        ...other,
        assignee: {
          name,
          emailAddress
        },
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        user: fb.auth().currentUser.email
      };
      await fb
        .database()
        .ref("cr/allotments")
        .push()
        .set(allotmentData);

      this.submissionStatus = "complete";
    },
    reset() {
      this.allotment = {
        assignee: null,
        files: [],
        comment: null
      };
      this.filesSelector = {
        language: null,
        list: null,
        count: 20
      };
      this.files = null;
      this.submissionStatus = null;
    },
    filterSelectedFiles() {
      if (this.crFiles) {
        this.files = this.crFiles.reduce(
          (filteredItems, { languages, notes, ...other }) => {
            if (languages && languages.includes(this.filesSelector.language)) {
              filteredItems.push({
                languages,
                notes,
                filename: other[".key"]
              });
            }
            return filteredItems;
          },
          []
        );
      }
    }
  },
  watch: {
    "allotment.assignee": function(newValue) {
      if (newValue == null) return;

      for (let language of this.languages) {
        if (newValue.languages[language]) {
          this.filesSelector.language = language;
        }
      }
    },
    filesSelector: {
      deep: true,
      handler: function() {
        this.files = null;
        this.allotment.files = [];

        if (
          this.filesSelector.language == null ||
          this.filesSelector.list == null
        )
          return;
        this.$bindAsArray(
          "crFiles",
          fb.database().ref(`files/${this.filesSelector.list}`),
          null, 
          this.filterSelectedFiles
        );
      }
    }
  }
};
</script>
