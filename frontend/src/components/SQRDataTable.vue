<template>
  <v-data-table
    :headers="headers"
    :pagination.sync="pagination"
    hide-actions
    :items="items"
    v-bind="datatableProps"
  >
    <template
      slot="items"
      slot-scope="{ item }"
    >
      <td v-for="( value , key, index) in headers" :key="index">
        {{ getItem(item, value) }}
      </td>
    </template>

    <template slot="footer">
      <slot name="sqrFooter"></slot>
    </template>
  </v-data-table>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import _ from "lodash";

interface IAnyObject {
  [key: string]: any;
}

@Component({
  name: "SQRDataTable"
})
export default class SQRDataTable extends Vue {
  pagination = { rowsPerPage: -1 };

  // separator for array.join
  @Prop({ default: ", " })
  separator!: string;

  // Callback for missing value in all columns
  @Prop({ default: () => (value: any) => "" })
  missingFileCb!: (value: any) => any;

  // Callback for custom value per property
  @Prop({ default: () => ({}) })
  computedValue!: { [key: string]: (value: string, item: any) => any };

  // Items for v-data-table component
  @Prop() items!: any[];

  // Props for v-data-table component
  @Prop({ default: () => ({}) })
  datatableProps!: IAnyObject;

  // Headers for v-data-table component
  @Prop({
    default: () => [
      { text: "Days Passed", value: "allotment.daysPassed" },
      { text: "Date Given", value: "allotment.timestampGiven" },
      { text: "Notes", value: "notes" },
      { text: "Languages", value: "languages" },
      { text: "Status", value: "status" },
      { text: "File Name", value: ".key" },
      { text: "Devotee", value: "allotment.devotee.name" },
      { text: "Email Address", value: "allotment.devotee.emailAddress" },
      { text: "Date Done", value: "allotment.timestampDone" },
      { text: "Follow Up", value: "allotment.followup" }
    ]
  })
  headers!: IAnyObject[];

  getItem(item: any, { value }: { value: string }) {
    if (Array.isArray(item[value])) {
      return _.get(item, value).join(this.separator);
    }
    // display value based on cb from parent
    if (this.computedValue[value]) return this.computedCb(value, item);
    return _.get(item, value, this.missingFileCb(value));
  }

  computedCb(value: string, item: any) {
    return this.computedValue[value](value, item);
  }
}
</script>

<style scoped>
</style>
