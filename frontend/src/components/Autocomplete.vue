<template>
  <v-autocomplete v-bind="$attrs" v-on="$listeners" :loading="loading">
    <template v-for="(_, slot) of filteredSlots" v-slot:[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
    <template v-slot:no-data>
      <div class="pa-2" v-if="loading">
        <slot name="loading-text">
          Loading data
        </slot>
      </div>
      <div class="pa-2" v-else>
        <slot name="no-data">
          No data available
        </slot>
      </div>
    </template>
  </v-autocomplete>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import _ from "lodash";

@Component({
  name: "Autocomplete"
})
export default class Autocomplete extends Vue {
  @Prop({ default: false }) loading!: boolean;

  get filteredSlots() {
    return _.fromPairs(
      _.toPairs(this.$scopedSlots).filter(
        ([slotName]: [string, any]) => slotName !== "no-data"
      )
    );
  }
}
</script>

<style scoped></style>
