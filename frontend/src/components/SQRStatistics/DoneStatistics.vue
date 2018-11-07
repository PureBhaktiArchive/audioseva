<template>
  <div>
    <span class=".font-weight-medium">Done statistics:</span>
    <s-q-r-data-table :datatableProps="{ hideHeaders: true }" :items="statistics" :headers="headers">
    </s-q-r-data-table>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import SQRDataTable from "../SQRDataTable.vue";

@Component({
  name: "DoneStatistics",
  components: { SQRDataTable }
})
export default class DoneStatistics extends Vue {
  @Prop() doneStatistics!: { [key: string]: number };

  get statsArray() {
    if (this.doneStatistics) return Object.entries(this.doneStatistics);
    return [];
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
