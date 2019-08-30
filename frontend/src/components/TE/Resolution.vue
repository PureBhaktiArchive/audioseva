<template>
  <div>
    <div v-if="resolution">
      <v-chip
        class="ml-0"
        disabled label
        :color="isApproved ? 'green' : 'red' "
        text-color="white"
      >
        {{ isApproved ? "Approved" : "Disapproved" }}
      </v-chip>
      <p class="mb-0">{{ resolution.feedback }}</p>
      <p class="subtext">{{ timestamp }}</p>
    </div>
    <v-btn class="ml-0" v-else-if="!resolution && item.status === 'WIP'" :to="`tasks/${item['.key']}`">Review</v-btn>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from "vue-property-decorator";

import LastVersionMixin from "@/components/TE/LastVersionMixin";
import FormatTime from "@/mixins/FormatTime";

@Component({
  name: "Resolution"
})
export default class Resolution extends Mixins<LastVersionMixin, FormatTime>(
  LastVersionMixin,
  FormatTime
) {
  @Prop() item!: any;
  @Prop() value!: string;

  get timestamp() {
    return this.formatTimestamp(this.resolution.timestamp);
  }
}
</script>

<style scoped>
</style>
