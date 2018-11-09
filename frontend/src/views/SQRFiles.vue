<template>
  <div>
    <header>
      <h1>SQR</h1>
    </header>
    <div class="nav-wrapper">
      <div>
        <v-btn-toggle v-model="selectedButton" mandatory>
          <v-btn v-for="(value, key, index) in lists" :key="index">
            {{ value }}
          </v-btn>
        </v-btn-toggle>
      </div>
      <div class="d-flex" :style="{ alignItems: 'center' }">
        <router-link :style="{ padding: '0 8px' }" to="sqr/statistics">SQR Statistics</router-link>
        <router-link to="sqr/allot">Allot</router-link>
      </div>
    </div>
    <s-q-r-data-table
      :datatableProps="{ pagination }"
      :computedValue="computedCb"
      :items="files"
    ></s-q-r-data-table>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import _ from "lodash";
import { db } from "@/main";
import SQRDataTable from "@/components/SQRDataTable.vue";
import { getDayDifference, formatTimestamp } from "@/utility";

@Component({
  name: "SQRFiles",
  components: {
    SQRDataTable
  }
})
export default class SQRFiles extends Vue {
  lists: string[] = [];
  sqrFileLists: any[] = [];
  selectedList: string = "";
  files: any[] = [];

  selectedButton: number = 0;

  pagination = { rowsPerPage: -1 };

  computedCb = {
    "allotment.daysPassed": (value: string, item: any) => {
      const dateGiven = _.get(item, "allotment.timestampGiven", false);
      if (dateGiven) {
        return getDayDifference(dateGiven);
      }
      return "";
    },
    "allotment.timestampGiven": formatTimestamp,
    "allotment.timestampDone": formatTimestamp
  };

  mounted() {
    this.$bindAsArray("sqrFileLists", db.ref("sqr/files/"), null, () => {
      this.lists = this.sqrFileLists.map(item => {
        return item[".key"];
      });
      // load initial table data after lists load
      this.handleButtonClick();
    });
  }

  @Watch("selectedButton")
  handleButtonClick() {
    this.$bindAsArray(
      "files",
      db.ref(`sqr/files/${this.lists[this.selectedButton]}`)
    );
  }
}
</script>

<style scoped>
.nav-wrapper {
  margin-bottom: 8px;
  justify-content: space-between;
  display: flex;
  flex-direction: row;
}
</style>
