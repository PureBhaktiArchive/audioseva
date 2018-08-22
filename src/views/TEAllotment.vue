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
        <div class="col-sm-offset-2 col-sm-10" v-if="allotment.trackEditor != null">Devotee languages:
          <strong>{{ allotment.trackEditor.languages}}</strong>
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
        <div class="col-sm-offset-2 col-sm-10" v-if="allotment.fc != null">Devotee languages:
          <strong>{{ allotment.fc.languages}}</strong>
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
      <div class="form-group row" v-show="tasks != null || filter.list && filter.language">
        <label for="tasks" class="col-sm-2 control-label">Tasks</label>
        <div class="col-sm-10" v-if="tasks">
          <div class="row mb-2" v-for="task in tasks" :key="task.id">
            <div class="col-md-3">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" v-model="allotment.tasks" :id="'task-' + task.id" :value="task" />
                <label class="form-check-label" :for="'task-' + task.id">{{ task.id }}</label>
              </div>
            </div>
            <div class="col-md-9 bg-light shadow-sm">
              <pre>{{ task.definition }}</pre>
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

<script>
export default {
  name: "TE",
  data: () => ({
    devotees: {
      trackEditors: [],
      fcs: []
    },
    languages: ["English", "Hindi", "Bengali", "None"],
    lists: ["ML1", "ML2"],
    tasks: [
      {
        id: "ML1-020-1",
        definition:
          "20 A_Hindi _New Archive; beginning - end\n+\n20 B_Hindi _New Archive; beginning - end"
      },
      {
        id: "ML1-021-1",
        definition:
          "21 A_Hindi _New Archive\n+\n21 B_Hindi _New Archive (0:00:00 - 0:24:45)"
      }
    ],
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
    // google.script.run
    //   .withSuccessHandler(data => {
    //     this.soundEditors = data;
    //     // if (this.$route.query.emailAddress) {
    //     //   this.allotment.devotee = this.devotees.find(devotee => devotee.emailAddress == this.$route.query.emailAddress);
    //     //   this.allotment.repeated = true;
    //     // }
    //   })
    //   .getDevotees("Sound Editing service");
    // google.script.run
    //   .withSuccessHandler(data => {
    //     this.qualityCheckers = data;
    //   })
    //   .getDevotees("QC service");
    // google.script.run
    //   .withSuccessHandler(data => {
    //     this.lists = data;
    //   })
    //   .getAvailableSoundEditingLists();
  },
  methods: {
    allot() {
      this.submissionStatus = "inProgress";
      // google.script.run
      //   .withSuccessHandler(data => {
      //     this.submissionStatus = "complete";
      //   })
      //   .withFailureHandler(error => {
      //     this.submissionStatus = "error";
      //     alert(error.message);
      //   })
      //   .allotSoundEditingTasks(
      //     this.allotment.soundEditor,
      //     this.allotment.qualityChecker,
      //     this.allotment.tasks,
      //     this.allotment.comment
      //   );
    },
    reset() {
      Object.assign(this.$data, this.$options.data());
    }
  }
};
</script>

<style>
</style>
