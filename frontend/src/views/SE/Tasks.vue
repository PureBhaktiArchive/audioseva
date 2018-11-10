<template>
  <div>
    <header>
      <h1>SE</h1>
    </header>
    <s-q-r-data-table :computedValue="computedCb" :headers="headers" :items="tasks">
    </s-q-r-data-table>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import _ from "lodash";
import fb from "@/firebaseApp";
import SQRDataTable from "@/components/SQRDataTable.vue";
import { ITasks } from "@/types/SE";

@Component({
  name: "Tasks",
  components: { SQRDataTable }
})
export default class Tasks extends Vue {
  tasks: ITasks[] = [];

  computedCb = {
    soundIssues: (value: string, item: any) => {
      const [beginning, ending, type, description] = _.get(item, value, false);
      if (beginning) return `${beginning}-${ending}: ${type}: ${description}`;
    }
  };

  headers = [
    {
      text: "Task ID",
      value: ".key"
    },
    {
      text: "Duration in minutes",
      value: "duration"
    },
    {
      text: "Sound Issues",
      value: "soundIssues"
    }
  ];

  mounted() {
    this.fetchTasks();
  }

  fetchTasks() {
    this.$bindAsArray("tasks", fb.database().ref("sound-engineering/tasks"));
  }
}
</script>

<style scoped>
</style>
