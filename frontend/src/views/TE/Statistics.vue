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
        :styles="styles"
      >
      </data-table>
    </div>
  </section>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import firebase from "firebase/app";
import moment from "moment";
import "firebase/database";
import DataTable from "@/components/DataTable.vue";

@Component({
  name: "Statistics",
  components: { DataTable }
})
export default class Statistics extends Vue {
  lists: any = null;

  headers = [
    { text: "Date", value: ".key", sortable: false },
    { text: "Submitted", value: "Submitted", sortable: false },
    { text: "Done", value: "Done", sortable: false },
    { text: "To Revise", value: "Revise", sortable: false },
    { text: "Given", value: "Given", sortable: false }
  ];

  styles = {
    ".key": {
      "text-no-wrap": true
    }
  };

  computedValue = {
    ".key": (value, item) => {
      return item[value] === moment().format("MM-DD-YYYY")
        ? "Today"
        : item[value];
    }
  } as { [key: string]: (value: string, item: any) => any };

  mounted() {
    this.getLists();
  }

  get statistics() {
    return this.lists || [];
  }

  getLists() {
    this.$bindAsArray(
      "lists",
      firebase
        .database()
        .ref("/statistics/trackEditing")
        .orderByChild("_sort_timestamp")
        .startAt(
          moment()
            .subtract(6, "days")
            .valueOf()
        )
        .limitToLast(4)
    );
  }
}
</script>

<style scoped>
>>> .v-datatable {
  width: auto;
}
</style>
