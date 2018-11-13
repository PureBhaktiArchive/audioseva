<template>
  <div>
    <s-q-r-data-table
      :missingFileCb="missingValueCb"
      :items="items"
      :headers="headers"
      :datatableProps="{ loading: isLoading }"
    >
      <template slot="sqrFooter">
        <td
          :style="{ borderTop: 'double', backgroundColor: 'lightgray'}"
          v-for="( value , key, index) in headers" :key="index"
        >
          {{ getFooterData(value) }}
        </td>
      </template>
    </s-q-r-data-table>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import SQRDataTable from "../SQRDataTable.vue";

@Component({
  name: "FilesByStatus",
  components: { SQRDataTable }
})
export default class FilesByStatus extends Vue {
  headers = [
    { text: "List", value: "list" },
    { text: "WIP", value: "WIP" },
    { text: "Spare", value: "Spare" },
    { text: "Given", value: "Given" },
    { text: "GRAND", value: "GRAND" }
  ];

  @Prop() items: any;
  @Prop() countByStatus!: { [key: string]: number };
  @Prop() isLoading!: boolean;

  missingValueCb() {
    return 0;
  }

  getFooterData({ value }: { value: string }) {
    if (value === "list") return "GRAND";
    return this.countByStatus[value] || 0;
  }
}
</script>

<style scoped>
</style>
