/*
 * sri sri guru gauranga jayatah
 */
<template>
  <div>
    <h1>TE Allotment Form</h1>
    <form @submit.stop.prevent="allot" v-show="submissionStatus != 'complete'">

      <!-- Track Editor -->
      <div class="form-group row">
        <label for="track-editor" class="col-sm-2 control-label">Track Editor</label>
        <div class="col-col-sm-offset-2 col-sm-10">
          <v-select name="track-editor" required :options="devotees.trackEditors" v-model="allotment.trackEditor" label="name">
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
      </div>

      <!-- Fidelity Check -->
      <div class="form-group row">
        <label for="fc" class="col-sm-2 control-label">Fidelity Checker</label>
        <div class="col-sm-10">
          <v-select name="fc" required :options="devotees.fcs" v-model="allotment.fc" label="name">
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
      </div>

      <!-- Language -->
      <div class="form-group row">
        <label class="col-sm-2 control-label">Langauge</label>
        <div class="col-sm-10">
          <template v-if="languages">
            <div class="form-check form-check-inline" v-for="language in languages" :key="language">
              <input class="form-check-input" type="radio" v-model="filter.language" :value="language" name="language" :id="'language' + language" required>
              <label class="form-check-label" :for="'language' + language">{{ language }}</label>
            </div>
          </template>
          <p class="form-control-static" v-else>Loading…</p>
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

      <!-- Tasks -->
      <div id="tasks" class="form-group row" v-show="tasks != null || filter.list && filter.language">
        <label for="tasks" class="col-sm-2 control-label">Tasks</label>
        <div class="col-sm-10" v-if="tasks">
          <div class="row mb-2" v-for="task in tasks" :key="task.id">
            <div class="col-md-3">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" v-model="allotment.tasks" :id="'task-' + task.id" :value="task" />
                <label class="form-check-label" :for="'task-' + task.id">{{ task.id }}</label>
              </div>
              <span class="badge badge-info">{{ task.action }}</span>
              <span class="badge badge-warning" v-if="task.sourceFiles.length === 0">No source files</span>
            </div>
            <div class="col-md-9">
              <pre class="p-1 shadow-sm">{{ task.definition }}</pre>
            </div>
          </div>
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
  </div>
</template>

<style>
#tasks pre {
  background-color: #ffcccc;
}
</style>

<script>
export default {
  name: "TE",
  http: {
    root:
      "https://script.google.com/macros/s/AKfycbzA-Ymekm0TYYqns8Z22GGBNkfI43lRyv6ofYx8CEyWU0Sao9Ll/"
  },
  data: () => ({
    devotees: {
      trackEditors: [],
      fcs: []
    },
    languages: ["English", "Hindi", "Bengali", "None"],
    lists: null,
    tasks: null,
    filter: {
      language: null,
      list: null
    },
    allotment: {
      trackEditor: null,
      fc: null,
      tasks: [],
      comment: null
    },
    submissionStatus: null
  }),
  mounted: function() {
    // Getting TEs
    this.$http
      .jsonp("exec", { params: { path: "te/devotees", role: "TE" } })
      .then(response => {
        this.devotees.trackEditors = response.body;
      });

    // Getting FCs
    this.$http
      .jsonp("exec", { params: { path: "te/devotees", role: "FC" } })
      .then(response => {
        this.devotees.fcs = response.body;
      });

    // Getting lists
    this.$http
      .jsonp("exec", { params: { path: "te/lists" } })
      .then(response => {
        this.lists = response.body;
      });
  },
  methods: {
    allot() {
      this.submissionStatus = "inProgress";
      this.$http
        .post(
          "https://hook.integromat.com/n45ody4b541ykox5aba58f11wwakfe54",
          this.allotment
        )
        .then(
          () => {
            this.submissionStatus = "complete";
          },
          () => {}
        );
    },
    reset() {
      Object.assign(this.$data, this.$options.data());
    }
  },
  watch: {
    filter: {
      deep: true,
      handler: function() {
        this.tasks = null;
        this.allotment.tasks = [];

        if (this.filter.language == null || this.filter.list == null) return;

        this.$http
          .jsonp("exec", {
            params: {
              path: "te/tasks",
              list: this.filter.list,
              language: this.filter.language
            }
          })
          .then(response => {
            this.tasks = response.body;
          });
      }
    }
  }
};
</script>
