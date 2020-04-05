<template>
  <div :style="{ paddingTop: '4px' }">
    <div v-if="lastResolution">
      <div
        class="pb-2"
        :style="{
          display: 'inline-flex',
          alignItems: 'center',
        }"
      >
        <v-avatar size="26" class="mr-2" :color="icon.color">
          <v-icon size="14" class="white--text">{{ icon.icon }}</v-icon>
        </v-avatar>
        {{ text }}
      </div>
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
import _ from "lodash";
import LastVersionMixin from "@/components/TE/LastVersionMixin";
import FormatTime from "@/mixins/FormatTime";

@Component({
  name: "Resolution",
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

  get icon() {
    return {
      icon: this.lastIsApproved
        ? (this.$vuetify.icons as any).values.check
        : (this.$vuetify.icons as any).values.undo,
      color: this.lastIsApproved ? "green" : "red",
    };
  }

  get text() {
    const author = _.get(this.lastResolution || {}, "author.name", "");
    const feedback = _.get(this.lastResolution || {}, "feedback", "");
    return `${this.lastIsApproved ? "Approved" : "Disapproved"} by ${author}${
      feedback ? `: ${feedback}` : ""
    }`;
  }
}
</script>

<style scoped></style>
