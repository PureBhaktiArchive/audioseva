/*
 * sri sri guru gauranga jayatah
 */
<template>
  <div>
    <h1>Sound Editing QC Allotment Form</h1>
    <form @submit.stop.prevent="allot" v-show="submissionStatus != 'complete'">
      <div class="form-row" v-for="(task, index) in tasks" :key="index">
        <div class="form-group col-md-4">
          <input class="form-control" placeholder="Cleaned File Link" v-model="task.cleanedFileLink" @keyup="findOriginalFile(index)">
          <small class="form-text text-muted">{{ task.fileName }}</small>
        </div>
        <div class="form-group col">
          <input class="form-control" placeholder="Original File Link" v-model="task.originalFileLink">
        </div>
        <div class="form-group col">
          <button role="button" class="btn btn-danger" @click="deleteTask(index)"><octicon name="x"></octicon></button>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group col-sm-3">
          <button class="btn btn-secondary" @click="addTask">Add row</button>
        </div>
      </div>

      <div class="form-group">
        <label for="comment" class="control-label">Comment</label>
        <textarea v-model="comment" class="form-control" rows="3"></textarea>
      </div>

      <div class="form-group">
        <button type="submit" class="btn btn-primary" :disabled="submissionStatus === 'inProgress'">Allot
          <octicon name="sync" spin v-show="submissionStatus === 'inProgress'"></octicon>
        </button>
      </div>
    </form>

    <div id="confirmation-message" v-show="submissionStatus === 'complete'">
      <div class="alert alert-success" role="alert">
        Allotted successfully.
        <button type="button" class="btn btn-default" @click="reset">Make another allotment</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "qc",
  data: () => ({
    tasks: [{}],
    comment: null,
    submissionStatus: null
  }),
  methods: {
    addTask() {
      this.tasks.push({});
    },
    deleteTask(index) {
      this.tasks.splice(index, 1);
    },
    findOriginalFile(index) {
      const task = this.tasks[index];

      if (task.cleanedFileLink == null) return;
    },
    allot() {
      this.submissionStatus = "inProgress";
    },
    reset() {
      Object.assign(this.$data, this.$options.data());
    }
  }
};
</script>

<style>
</style>
