/*
 * sri sri guru gauranga jayatah
 */
<template>
  <v-container>
    <h1>Sound Quality Reporting</h1>
    <v-form @submit.stop.prevent v-show="submissionStatus != 'complete'" class="pa-3 pt-4">
      <v-autocomplete
        v-model="allotment.devotee"
        :hint="allotment.devotee ? `Languages: ${allotment.devotee.languages.join(', ')}`: ''"
        :items="devotees"
        item-text="name"
        label="Select a devotee"
        persistent-hint
        return-object
        clearable
        dense
      ></v-autocomplete>
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
      <v-layout v-if="files != null || filter.list">
        <v-container fluid v-if="files">
          <v-layout v-if="files.length > 0" align-center v-for="file in files" :key="file.filename">
            <v-checkbox v-model="allotment.files" :value="file" :loading="!files">
              <code slot="label">{{ file.filename }}</code>
            </v-checkbox>
            <span>{{ file.notes }}</span>
          </v-layout>
          <span
            v-if="files.length === 0"
          >No spare files found for selected language in {{filter.list}} list.</span>
        </v-container>
        <p v-else>Loading files…</p>
      </v-layout>
      <p v-else>Choose list and language to select files.</p>
      <!-- Comment -->
      <v-textarea v-model="allotment.comment" box label="Comment" rows="3"></v-textarea>
      <!-- Buttons -->
      <v-btn @click="allot" :loading="submissionStatus === 'inProgress'">Allot</v-btn>
    </v-form>
    <v-alert :value="submissionStatus === 'complete'" type="success" transition="scale-transition">
      <h4 class="alert-heading">Allotted succesfully</h4>
      <p class="mb-0">
        <v-btn @click="reset">Make another allotment</v-btn>
      </p>
    </v-alert>
  </v-container>
</template>

<style>
#files pre {
  background-color: #f9f2f4;
  color: #c7254e;
}
</style>

<script>
export default {
  name: "ListeningAllotment",
  http: {
    root:
      "https://script.google.com/macros/s/AKfycbzA-Ymekm0TYYqns8Z22GGBNkfI43lRyv6ofYx8CEyWU0Sao9Ll/"
  },
  data: () => ({
    devotees: [],
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
      .jsonp("exec", {
        params: { path: "devotees", role: "Listening service" }
      })
      .then(response => {
        this.devotees = response.body;
      });

    // Getting lists
    this.$http
      .jsonp("exec", { params: { path: "sqr/lists" } })
      .then(response => {
        this.lists = response.body;
      });
  },
  watch: {
    filter: {
      deep: true,
      handler: function() {
        this.files = null;
        this.allotment.files = [];

        if (this.filter.list == null) return;

        this.$http
          .jsonp("exec", {
            params: {
              path: "sqr/files",
              list: this.filter.list,
              language: this.filter.language
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
        .post(
          "https://hook.integromat.com/to4r9rwrgeu5od4ncgyvs8ce7ewa88q3",
          this.allotment
        )
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
