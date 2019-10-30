<template>
  <v-data-table
    :headers="headers"
    :pagination.sync="customPagination"
    :items="items"
    v-bind="datatableProps"
    v-on="$listeners"
  >
    <template slot="items" slot-scope="{ item }">
      <tr :style="getTableRowStyle(item)" @click="$emit('click:row', item)">
        <td
          v-for="(value, key, index) in headers"
          :class="getStyles(value, item)"
          :key="getKey(item, value.value, index)"
          v-bind="getAttributes(item, value.value)"
        >
          <template v-if="computedComponent[value.value]">
            <table-data
              :item="item"
              :value="value.value"
              :Component="computedComponent[value.value]"
              :componentData="getComponentData(value.value)"
            ></table-data>
          </template>
          <template v-else>{{ getItem(item, value) }}</template>
        </td>
      </tr>
    </template>

    <template slot="no-data">
      <slot name="table-no-data"></slot>
    </template>

    <template slot="footer">
      <slot name="table-footer"></slot>
    </template>

    <template slot="no-results">
      <slot name="table-no-results"></slot>
    </template>
  </v-data-table>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import _ from "lodash";
import TableData from "@/components/TableData";

interface IAnyObject {
  [key: string]: any;
}

@Component({
  name: "DataTable",
  components: { TableData }
})
export default class DataTable extends Vue {
  @Prop({ default: () => ({ rowsPerPage: -1 }) })
  pagination!: any;

  get customPagination() {
    return this.pagination;
  }

  set customPagination(newPagination: any) {
    // not used but needed for customPagination getter
  }

  // separator for array.join
  @Prop({ default: ", " })
  separator!: string;

  @Prop({ default: () => ({}) })
  styles!: { [key: string]: any };

  @Prop({ default: () => ({}), type: Function })
  tableRowStyle!: (item: any) => { [key: string]: string };

  // Callback for missing value in all columns
  @Prop({ default: () => (value: any) => "" })
  missingFileCb!: (value: any) => any;

  // Callback for custom value per property
  @Prop({ default: () => ({}) })
  computedValue!: { [key: string]: (value: string, item: any) => any };

  // Pass item and value to component for additional control
  @Prop({ default: () => ({}) })
  computedComponent!: { [key: string]: any };

  @Prop({ default: () => ({}) })
  componentData!: { [key: string]: any };

  @Prop({ default: () => ({}) })
  tdAttributes!: { [key: string]: any };

  // Items for v-data-table component
  @Prop() items!: any[];

  // Props for v-data-table component
  @Prop({ default: () => ({ hideActions: true }) })
  datatableProps!: IAnyObject;

  // Headers for v-data-table component
  @Prop() headers!: IAnyObject[];

  getStyles({ value }: { value: string }, item: any) {
    if (typeof this.styles[value] === "function") {
      return this.styles[value](value, item);
    }
    return this.styles[value] || {};
  }

  getTableRowStyle(item: any) {
    return this.tableRowStyle(item);
  }

  getComponentData(value: string) {
    return _.get(this.componentData, value, {});
  }

  getKey(item: any, value: string, index: number) {
    if (this.keyExtractor) {
      return this.keyExtractor(item, value, index);
    } else if (typeof item === "string") {
      return `${item}-${value}`;
    } else {
      return `${index}-${value}`;
    }
  }

  getItem(item: any, { value }: { value: string }) {
    // display value based on cb from parent
    if (this.computedValue[value]) return this.computedCb(value, item);

    if (Array.isArray(item[value])) {
      return _.get(item, value).join(this.separator);
    }
    return _.get(item, value, this.missingFileCb(value));
  }

  getAttributes(item: any, value: string) {
    return this.tdAttributes[value] || {};
  }

  computedCb(value: string, item: any) {
    return this.computedValue[value](value, item);
  }
}
</script>

<style scoped>
>>> tbody td {
  vertical-align: top;
}
</style>
