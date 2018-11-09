<template>
  <div>
    <span class=".font-weight-medium">Spare by language:</span>
    <s-q-r-data-table :headers="headers" :items="statistics" :datatableProps="{ hideHeaders: true }"></s-q-r-data-table>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import SQRDataTable from "../SQRDataTable.vue";
import { mergeLanguageStatistics } from "@/utility";

@Component({
  name: "SpareByLanguage",
  components: { SQRDataTable }
})
export default class SpareByLanguage extends Vue {
  @Prop() spareByLanguage!: { [key: string]: number };

  headers = [{ value: "language" }, { value: "statistic" }];

  get statsArray() {
    return Object.entries(mergeLanguageStatistics(this.spareByLanguage));
  }

  get statistics() {
    return this.statsArray.map(([language, statistic]) => ({
      language,
      statistic
    }));
  }
}
</script>

<style scoped>
</style>
