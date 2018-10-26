/*
 * sri sri guru gauranga jayatah
 */
<template>
  <div>
    <h1>Sound Quality Reporting</h1>
    <v-form @submit.stop.prevent v-if="submissionStatus != 'complete'">
      <v-autocomplete
        v-model="allotment.devotee"
        :hint="allotment.devotee ? `Languages: ${allotment.devotee.languages.join(', ')}`: ''"
        :items="devotees || []"
        :loading="devotees === null"
        item-text="name"
        label="Select a devotee"
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
              <v-checkbox v-model="allotment.files" :value="file.filename" :loading="!files">
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
import fb from "@/firebaseApp";

export default {
  name: "SQRAllotment",
  data: () => ({
    devotees: null,
    languages: ["English", "Hindi", "Bengali"],
    lists: null,
    files: null,
    filter: {
      language: null,
      list: null
    },
    allotment: {
      devotee: null,
      files: [],
      comment: null
    },
    submissionStatus: null
  }),
  mounted: function() {
    // Getting devotees
    this.$http
      .jsonp(process.env.VUE_APP_SCRIPT_URL, {
        params: { path: "devotees", role: "SQR" }
      })
      .then(response => {
        this.devotees = response.body;
        if (this.$route.query.emailAddress) {
          this.allotment.devotee = this.devotees.find(
            devotee => devotee.emailAddress === this.$route.query.emailAddress
          );
        }
      });

    // Getting lists
    this.$http
      .jsonp(process.env.VUE_APP_SCRIPT_URL, { params: { path: "sqr/lists" } })
      .then(response => {
        this.lists = response.body;
      });
  },
  watch: {
    "allotment.devotee": function(newValue) {
      if (newValue == null) return;

      for (let language of this.languages) {
        if (newValue.languages.includes(language))
          this.filter.language = language;
      }
    },
    filter: {
      deep: true,
      handler: function() {
        this.files = null;
        this.allotment.files = [];

        if (this.filter.list == null) return;

        this.$bindAsArray(
          "sqrFiles",
          fb
            .database()
            .ref(`sqr/files/${this.filter.list}`)
            .orderByChild("status")
            .equalTo("Spare"),
          null, // cancel callback not used
          this.filterSelectedFiles
        );
      }
    }
  },
  methods: {
    async allot() {
      this.submissionStatus = "inProgress";
      await fb
        .database()
        .ref("sqr/allotments")
        .push()
        .set(this.allotment);
      this.submissionStatus = "complete";
    },
    reset() {
      Object.assign(this.$data.allotment, this.$options.data().allotment);
      Object.assign(this.$data.filter, this.$options.data().filter);
      this.submissionStatus = null;
    },
    filterSelectedFiles() {
      if (this.sqrFiles) {
        this.files = this.sqrFiles.reduce(
          (filteredItems, { status, languages, notes, ...other }) => {
            if (languages.includes(this.filter.language)) {
              filteredItems.push({
                status,
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
  }
};
</script>
