<template>
  <div>
    <span class=".font-weight-medium">Done statistics:</span>
    <data-table :datatableProps="{ hideHeaders: true }" :items="statistics" :headers="headers">
    </data-table>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import DataTable from "../DataTable.vue";
import { mergeDoneStatistics } from "@/utility";

@Component({
  name: "DoneStatistics",
  components: { DataTable }
})
export default class DoneStatistics extends Vue {
  @Prop() doneStatistics!: { [key: string]: number };

  get statsArray() {
    return Object.entries(mergeDoneStatistics(this.doneStatistics));
  }

  headers = [{ value: "doneText" }, { value: "statistic" }];

  get statistics() {
    return this.statsArray.map(([date, statistic]) => ({
      doneText: this.getDoneText(date),
      statistic
    }));
  }

  getDoneText(date: string) {
    return `Done ${date === "today" ? "today" : `on ${date}`}`;
  }
}
</script>

<style scoped>
</style>
