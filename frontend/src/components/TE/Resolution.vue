<template>
  <div>
    <div v-if="lastResolution">
      <v-chip
        class="ma-1 ml-0"
        label
        :color="lastIsApproved ? 'green' : 'red'"
        text-color="white"
      >
        {{ lastIsApproved ? "Approved" : "Disapproved" }}
      </v-chip>
      <p class="mb-0">{{ lastResolution.feedback }}</p>
      <p class="subtext">{{ timestamp }}</p>
    </div>
    <v-btn
      class="ml-0"
      v-else-if="shouldShowReviewButton"
      :to="`tasks/${item['.key']}`"
    >
      Review
    </v-btn>
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
  @Prop({ default: true })
  showReviewButton!: boolean;

  get timestamp() {
    return this.formatTimestamp(this.lastResolution.timestamp);
  }

  get shouldShowReviewButton() {
    return (
      this.showReviewButton &&
      !this.lastResolution &&
      this.lastVersion &&
      this.item.status === "WIP"
    );
  }
}
</script>

<style scoped></style>
