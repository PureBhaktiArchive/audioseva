<template>
  <div>
    {{ timestamp }}
    <p class="caption" :style="{ color: 'rgb(169, 169, 169)' }" v-if="daysPassed">{{ daysPassed }}</p>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from "vue-property-decorator";
import moment from "moment";
import FormatTime from "@/mixins/FormatTime";

@Component({
  name: "TimestampGiven"
})
export default class DateGiven extends Mixins<FormatTime>(FormatTime) {
  @Prop() item!: any;

  @Prop() value!: any;

  get daysPassed() {
    return this.item.status !== "Done"
      ? moment(this.item.timestampGiven).from(moment())
      : "";
  }

  get timestamp() {
    return this.formatTimestamp(this.item.timestampGiven);
  }
}
</script>

<style scoped>
</style>
