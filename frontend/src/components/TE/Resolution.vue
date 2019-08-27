<template>
  <div>
    <div v-if="version.resolution">
      <v-chip disabled label :color="isApproved ? 'green' : 'red' " text-color="white">{{ isApproved ? "Approved" : "Disapproved" }}</v-chip>
      <p class="mb-0">{{ version.resolution.feedback }}</p>
      <p class="subtext">{{ timestamp }}</p>
    </div>
    <v-btn v-else :to="`tasks/${item['.key']}`">Review</v-btn>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from "vue-property-decorator";

import LastVersionMixin from "@/components/TE/LastVersionMixin";
import FormatTime from "@/mixins/FormatTime";

@Component({
  name: "Resolution"
})
export default class Feedback extends Mixins<LastVersionMixin, FormatTime>(
  LastVersionMixin,
  FormatTime
) {
  @Prop() item!: any;
  @Prop() value!: string;

  get timestamp() {
    return this.formatTimestamp(this.version.resolution.timestamp);
  }

  get isApproved() {
    return this.version.resolution.isApproved;
  }
}
</script>

<style scoped>
</style>
