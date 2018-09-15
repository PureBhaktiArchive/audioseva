/*
 * sri sri guru gauranga jayatah
 */
<template>
  <div>
    <h1>Content Details Reporting</h1>
    <form @submit.stop.prevent="allot" v-show="submissionStatus != 'complete'">

      <!-- Devotee -->
      <div class="form-group row">
        <label for="devotee" class="col-sm-2 control-label">Devotee</label>
        <div class="col-col-sm-offset-2 col-sm-10">
          <v-select name="devotee" required :options="devotees" v-model="allotment.devotee" label="name">
            <template slot="option" slot-scope="option">
              <div>
                <div class="row">
                  <div class="col-md-4">
                    <strong>{{option.name}}</strong>
                  </div>
                  <div class="col-md-4">{{option.emailAddress}}</div>
                </div>
              </div>
            </template>
          </v-select>
        </div>
        <div class="col-sm-offset-2 col-sm-10" v-if="allotment.devotee != null">Devotee languages: <strong>{{ allotment.devotee.languages.join(', ')}}</strong></div>
      </div>

      <!-- Language -->
      <div class="form-group row">
        <label class="col-sm-2 control-label">Language</label>
        <div class="col-sm-10">
          <div class="form-check form-check-inline" v-for="language in languages" :key="language">
            <input class="form-check-input" type="radio" v-model="filter.language" :value="language" name="language" :id="'language' + language" required>
            <label class="form-check-label" :for="'language' + language">{{ language }}</label>
          </div>
        </div>
      </div>

      <!-- List -->
      <div class="form-group row">
        <label class="col-sm-2 control-label">List</label>
        <div class="col-sm-10">
          <template v-if="lists">
            <div class="form-check form-check-inline" v-for="list in lists" :key="list">
              <input class="form-check-input" type="radio" v-model="filter.list" :value="list" name="list" :id="'list' + list" required>
              <label class="form-check-label" :for="'list' + list">{{ list }}</label>
            </div>
          </template>
          <p class="form-control-static" v-else>Loading…</p>
        </div>
      </div>

      <!-- Files -->
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

    </form>

    <div class="alert alert-success col-sm-offset-2 col-sm-10" role="alert" v-show="submissionStatus === 'complete'">
      <h4 class="alert-heading">Allotted succesfully</h4>
      <p class="mb-0"><button type="button" class="btn btn-link" @click="reset">Make another allotment</button></p>
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
    // Getting TEs
    this.$http
      .jsonp("exec", {
        params: { path: "devotees", role: "Listening service" }
      })
      .then(response => {
        this.devotees = response.body;
      });

    // Getting lists
    this.$http
      .jsonp("exec", { params: { path: "cdr/lists" } })
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
              path: "cdr/files",
              list: this.filter.list
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
