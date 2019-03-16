/*
 * sri sri guru gauranga jayatah
 */
<template>
  <div>
    <h1>Sound Quality Reporting</h1>
    <v-form @submit.stop.prevent v-if="submissionStatus != 'complete'">
      <v-autocomplete
        v-model="allotment.assignee"
        :hint="allotment.assignee ? `Languages: ${allotment.assignee.languages.join(', ')}`: ''"
        :items="assignees || []"
        :loading="assignees === null"
        item-text="name"
        item-value="id"
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
        <v-btn-toggle v-model="filter.language">
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
      <!-- Files -->
      <template v-if="filter.list && filter.language">
        <template v-if="files">
          <template v-if="files.length > 0">
            <v-layout align-center v-for="file in files" :key="file.filename">
              <v-checkbox v-model="allotment.files" :value="file" :loading="!files">
                <code slot="label">{{ file.filename }}</code>
              </v-checkbox>
              <span>{{ file.notes }}</span>
            </v-layout>
          </template>
          <p v-else>No spare files found for selected language in {{filter.list}} list.</p>
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
      <h4 class="alert-heading">Allotted succesfully</h4>
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
import firebase from "firebase/app";
import "firebase/functions";

export default {
  name: "SQRAllotment",
  data: () => ({
    assignees: null,
    languages: ["English", "Hindi", "Bengali"],
    lists: null,
    files: null,
    filter: {
      language: null,
      list: null
    },
    allotment: {
      assignee: null,
      files: [],
      comment: null
    },
    submissionStatus: null
  }),
  mounted: async function() {
    // Getting assignees
    const result = await firebase
      .functions()
      .httpsCallable("User-getAssignees")({
      phase: "SQR"
    });
    this.assignees = result.data;
    if (this.$route.query.emailAddress) {
      this.allotment.assignee = this.assignees.find(
        assignee => assignee.emailAddress === this.$route.query.emailAddress
      );
    }

    // Getting lists
    this.lists = (await firebase
      .functions()
      .httpsCallable("SQR-getLists")()).data;
  },
  watch: {
    "allotment.assignee": function(newValue) {
      if (newValue == null) return;

      for (let language of this.languages) {
        if (newValue.languages.includes(language))
          this.filter.language = language;
      }
    },
    filter: {
      deep: true,
      handler: async function() {
        this.files = null;
        this.allotment.files = [];

        if (this.filter.list == null) return;

        const result = await firebase
          .functions()
          .httpsCallable("SQR-getSpareFiles")(this.filter);
        this.files = result.data;
      }
    }
  },
  methods: {
    async allot() {
      this.submissionStatus = "inProgress";
      try {
        await firebase.functions().httpsCallable("SQR-processAllotment")(
          this.allotment
        );
        this.submissionStatus = "complete";
      } catch (error) {
        alert(error.message);
        this.submissionStatus = "error";
      }
    },
    reset() {
      Object.assign(this.$data.allotment, this.$options.data().allotment);
      Object.assign(this.$data.filter, this.$options.data().filter);
      this.submissionStatus = null;
    }
  }
};
</script>
