<template>
  <v-data-table
    :headers="headers"
    :items="items"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <template slot="item" slot-scope="{ item, ...rest }">
      <tr :style="getTableRowStyle(item)" @click="$emit('click:row', item)">
        <td
          v-for="(value, index) in headers"
          :key="getKey(item, value.value, index, rest.index)"
          :class="getClasses(value, item)"
        >
          <slot
            :name="value.value"
            v-bind="{ item, value: value.value, ...rest }"
          >
            {{ getDefaultItem(item, value.value) }}
          </slot>
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
import { Component, Vue, Prop } from 'vue-property-decorator';
import _ from 'lodash';
import TableData from '@/components/TableData';

interface IAnyObject {
  [key: string]: any;
}

@Component({
  name: 'DataTable',
  components: { TableData },
})
export default class DataTable extends Vue {
  // separator for array.join
  @Prop({ default: ', ' })
  separator!: string;

  @Prop({ default: () => ({}) })
  classes!: { [key: string]: any };

  @Prop({ default: () => ({}), type: Function })
  tableRowStyle!: (item: any) => { [key: string]: string };

  @Prop()
  keyExtractor!: (
    item: any,
    value: any,
    index: number,
    rowIndex: number
  ) => string;

  // Callback for missing value in all columns
  @Prop({ default: () => (value: any) => '' })
  missingItemCb!: (value: any) => any;

  // Items for v-data-table component
  @Prop() items!: any[];

  // Headers for v-data-table component
  @Prop() headers!: IAnyObject[];

  getClasses({ value }: { value: string }, item: any) {
    if (typeof this.classes[value] === 'function') {
      return this.classes[value](value, item);
    }
    return this.classes[value] || {};
  }

  getTableRowStyle(item: any) {
    return this.tableRowStyle(item);
  }

  getKey(item: any, value: string, columnIndex: number, rowIndex: number) {
    if (this.keyExtractor) {
      return this.keyExtractor(item, value, columnIndex, rowIndex);
    } else if (typeof item === 'string') {
      return `${item}-${value}`;
    } else {
      return `${rowIndex}-${columnIndex}-${value}`;
    }
  }

  getDefaultItem(item: any, value: any) {
    if (Array.isArray(_.get(item, value))) {
      return _.get(item, value).join(this.separator);
    }
    return _.get(item, value, this.missingItemCb(value));
  }
}
</script>

<style scoped>
>>> tbody td {
  vertical-align: top;
}
</style>
