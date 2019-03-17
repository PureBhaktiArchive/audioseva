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
        item-value="id"
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
              <v-list-tile-sub-title v-html="item.emailaddress"></v-list-tile-sub-title>
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
      <!-- Files -->
      <template v-if="filter.list && filter.languages.length">
        <template v-if="files">
          <template v-if="files.length > 0">
            <template v-for="(file, index) in files">
              <div :key="file.filename">
                <v-divider v-if="index > 0 && files[index - 1].date !== file.date" />
                <v-layout align-center>
                  <v-checkbox
                    :style="{ flex: 'none' }"
                    v-model="allotment.files"
                    :value="file"
                    :loading="!files"
                    class="mr-2"
                  >
                    <code slot="label">{{ file.filename }}</code>
                  </v-checkbox>
                  <span>{{ file.date || "No date" }} {{ file.language || "No language" }} {{ file.notes }}</span>
                </v-layout>
              </div>
            </template>
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
export default {
  name: "SQRAllotment",
  data: () => ({
    devotees: null,
    languages: ["English", "Hindi", "Bengali"],
    lists: null,
    files: null,
    filter: {
      languages: [],
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
    this.$http
      .get(process.env.VUE_APP_DEVOTEES_URL, {
        params: { phase: "SQR" }
      })
      .then(response => {
        this.devotees = response.body;
        if (this.$route.query.emailAddress) {
          this.allotment.devotee = this.devotees.find(
            devotee => devotee.emailaddress === this.$route.query.emailAddress
          );
        }
      });

    // Getting lists
    this.$http
      .jsonp(process.env.VUE_APP_SCRIPT_URL, { params: { path: "sqr/lists" } })
      .then(response => {
        this.lists = response.body;
      });
    this.filter.languages = this.languages;
  },
  watch: {
    "allotment.devotee": function(newValue) {
      if (newValue == null) return;

      this.filter.languages = this.languages;
    },
    filter: {
      deep: true,
      handler: function() {
        this.files = null;
        this.allotment.files = [];
        if (this.filter.list == null) return;

        this.$http
          .get(process.env.VUE_APP_FILES_URL, {
            params: {
              phase: "sqr",
              list: this.filter.list,
              languages: this.filter.languages
            }
          })
          .then(response => {
            this.files = response.body;
          });
      }
    }
  },
  methods: {
    allot() {
      this.submissionStatus = "inProgress";
      this.$http
        .post(process.env.VUE_APP_SQR_ALLOTMENT_URL, this.allotment)
        .then(
          () => {
            this.submissionStatus = "complete";
          },
          response => {
            alert(response.text());
            this.submissionStatus = "error";
          }
        );
    },
    reset() {
      Object.assign(this.$data.allotment, this.$options.data().allotment);
      Object.assign(this.$data.filter, this.$options.data().filter);
      this.submissionStatus = null;
    }
  }
};
</script>
