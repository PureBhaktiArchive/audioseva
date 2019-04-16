<template>
  <section>
    <header>
      <h1>Track Editing Statistics</h1>
    </header>
    <div>
      <data-table
        :datatableProps="{ loading: lists === null }"
        :headers="headers"
        :items="statistics"
        :computedValue="computedValue"
      >
      </data-table>
    </div>
  </section>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import firebase from "firebase/app";
import "firebase/database";
import DataTable from "@/components/DataTable.vue";
import { teStatistics } from "@/utility";

@Component({
  name: "Statistics",
  components: { DataTable }
})
export default class Statistics extends Vue {
  lists: any = null;

  headers = [
    { text: "", value: "date", width: "10%", sortable: false },
    { text: "Submitted", value: "Submitted", sortable: false },
    { text: "Done", value: "Done", sortable: false },
    { text: "To Revise", value: "Revise", sortable: false },
    { text: "Given", value: "Given", sortable: false }
  ];

  computedValue = {
    date: (value, item) => (item[value] === "today" ? "Today" : item[value])
  } as { [key: string]: (value: string, item: any) => any };

  mounted() {
    this.getLists();
  }

  get statistics() {
    return this.lists
      ? Object.entries(teStatistics(this.lists)).map(([date, stats]) => ({
          date,
          ...stats
        }))
      : [];
  }

  getLists() {
    this.$bindAsArray("lists", firebase.database().ref("/edited"));
  }
}
</script>

<style scoped>
</style>
