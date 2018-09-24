/*
 * sri sri guru gauranga jayatah
 */
<template>
  <div>
    <h1>Content Reporting</h1>
    <v-form @submit.stop.prevent="allot" v-show="submissionStatus != 'complete'">
      <v-container fluid>
        <v-autocomplete v-model="allotment.devotee" :hint="allotment.devotee ? `Languages: ${allotment.devotee.languages.join(', ')}`: ''" :items="devotees" item-text="name" label="Select a devotee" persistent-hint return-object clearable dense>
        </v-autocomplete>

        <!-- Language -->
        <v-radio-group v-model="filter.language" label="Langauge" row>
          <v-radio v-for="language in languages" :key="language" :label="language" :value="language"></v-radio>
        </v-radio-group>

        <!-- List -->
        <v-radio-group v-model="filter.list" :mandatory="true" :loading="!lists" label="List" row>
          <v-radio v-for="list in lists" :key="list" :label="list" :value="list"></v-radio>
        </v-radio-group>

        <!-- Files -->
        <v-container fluid v-show="files != null || filter.language && filter.list">
          <v-checkbox v-for="file in files" :key="file.filename" v-model="allotment.files" :label="file.filename" :value="file" :loading="!files"></v-checkbox>
        </v-container>
      </v-container>
    </v-form>

    <div class="form-group row" v-show="files != null || filter.language && filter.list">
      <label for="files" class="col-sm-2 control-label">Files</label>
      <div class="col-sm-10" v-if="files">
        <div class="form-check" v-for="file in files" :key="file.filename">
          <input class="form-check-input" type="checkbox" v-model="allotment.files" :id="'file-' + file.filename" :value="file" />
          <label class="form-check-label" :for="'file-' + file.filename">
            <code>{{ file.filename }}</code>
            <span>{{ file.notes }}</span>
          </label>
        </div>
        <span v-if="files.length === 0">No {{filter.language}} files in {{filter.list}} list</span>
      </div>
      <span class="form-control-static col-sm-10" v-else>Loading…</span>
    </div>

    <!-- Comment -->
    <div class="form-group row">
      <label for="comment" class="col-sm-2 control-label">Comment</label>
      <div class="col-sm-10">
        <textarea v-model="allotment.comment" class="form-control" rows="3"></textarea>
      </div>
    </div>

    <!-- Buttons -->
    <div class="form-group row">
      <div class="col-sm-offset-2 col-sm-10">
        <button type="submit" class="btn btn-primary" :disabled="submissionStatus === 'inProgress'">Allot
          <span class="glyphicon glyphicon-refresh rotate" aria-hidden="true" v-show="submissionStatus === 'inProgress'"></span>
        </button>
      </div>
    </div>

    <div class="alert alert-success col-sm-offset-2 col-sm-10" role="alert" v-show="submissionStatus === 'complete'">
      <h4 class="alert-heading">Allotted succesfully</h4>
      <p class="mb-0">
        <button type="button" class="btn btn-link" @click="reset">Make another allotment</button>
      </p>
    </div>

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
  name: "CRAllotment",
  http: {
    root:
      "https://script.google.com/macros/s/AKfycbzA-Ymekm0TYYqns8Z22GGBNkfI43lRyv6ofYx8CEyWU0Sao9Ll/"
  },
  data: () => ({
    devotees: [],
    languages: ["English", "Hindi", "Bengali"],
    lists: null,
    files: [],
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
      .jsonp("exec", { params: { path: "cr/lists" } })
      .then(response => {
        this.lists = response.body;
      });
  },
  methods: {
    allot() {
      this.submissionStatus = "inProgress";
      this.$http
        .post("https://hook.integromat.com/qqqqqqqqqqqqqqqq", this.allotment)
        .then(
          () => {
            this.submissionStatus = "complete";
          },
          response => {
            alert(response.text());
          }
        );
    },
    reset() {
      Object.assign(this.$data.allotment, this.$options.data().allotment);
      Object.assign(this.$data.filter, this.$options.data().filter);
      this.submissionStatus = null;
    }
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
              path: "cr/files",
              list: this.filter.list,
              language: this.filter.language
            }
          })
          .then(response => {
            this.files = response.body;
          });
      }
    }
  }
};
</script>
