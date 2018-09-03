/*
 * sri sri guru gauranga jayatah
 */
<template>
  <div>
    <h1>TFC Allotment Form</h1>
    <form @submit.stop.prevent="allot" v-show="submissionStatus != 'complete'">

      <!-- Fidelity Check -->
      <div class="form-group row">
        <label for="fc" class="col-sm-2 control-label">TFC</label>
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

      <!-- Task -->
      <div class="form-group row">
        <label for="task" class="col-sm-2 control-label">Task</label>
        <div class="col-sm-10">
          <span v-if="allotment.task">{{allotment.task.id}}</span>
          <span v-else class="text-danger">Task is not defined. Please use the allotment link from the email.</span>
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

    <div id="confirmation-message" class="col-sm-offset-2 col-sm-10" v-show="submissionStatus === 'complete'">
      <div class="alert alert-success" role="alert">
        TFC allotted successfully. <button type="button" class="btn btn-default" @click="window.close()">Close</button>
      </div>
    </div>    

  </div>
</template>

<style>
#tasks pre {
  background-color: #f9f2f4;
  color: #c7254e;
}
</style>

<script>
export default {
  name: "TFC",
  http: {},
  data: () => ({
    devotees: {
      fcs: []
    },
    allotment: {
      fc: null,
      task: null,
      comment: null
    },
    submissionStatus: null
  }),
  mounted: function() {
    // Getting FCs
    this.$http
      .jsonp(process.env.VUE_APP_SCRIPT_URL, {
        params: { path: "te/devotees", role: "FC" }
      })
      .then(response => {
        this.devotees.fcs = response.body;
      });

    if (this.$route.query.task_id) {
      this.allotment.task = {
        id: this.$route.query.task_id
      };
    }
  },
  methods: {
    allot() {
      this.submissionStatus = "inProgress";
      this.$http
        .post(process.env.VUE_APP_SCRIPT_URL, this.allotment, {
          params: { path: "te/fc/allot" }
        })
        .then(
          () => {
            this.submissionStatus = "complete";
          },
          () => {
            this.submissionStatus = "error";
          }
        );
    }
  }
};
</script>
