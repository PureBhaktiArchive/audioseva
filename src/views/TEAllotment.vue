/*
 * sri sri guru gauranga jayatah
 */
<template>
  <div>
    <h1>Sound Editing TE Allotment Form</h1>
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

      <!-- Tasks -->
      <div class="form-group row">
        <label for="tasks" class="col-sm-2 control-label">Tasks</label>
        <div class="col-sm-10">
          <div v-for="task in tasks" :key="task.id">
            <div class="row">
              <div class="col-md-3">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" v-model="allotment.tasks" :value="task" />
                  <label class="form-check-label">
                    {{ task.id }}
                    <span class="badge" v-bind:class="{ 'badge-success': task.soundQuality == 'Good', 'badge-warning': task.soundQuality == 'Average', 'badge-danger': task.soundQuality == 'Bad', 'badge-secondary': task.soundQuality == 'Blank' || task.soundQuality == 'Inaudible' }">{{ task.soundQuality }}</span>
                  </label>
                </div>
              </div>
              <div class="col-md-5">
                <pre>{{ task.definition }}</pre>
              </div>
              <div class="col-md-4">
                {{ task.soundIssues }}
              </div>
            </div>
          </div>
        </div>
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
    tasks: [
      {
        id: "ML1-101-1",
        definition: "Hi101 A + Hi101 B",
        soundQuality: "Bad",
        soundIssues: "Noise"
      }
    ],
    comment: null,
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
