<template>
  <div v-if="version.resolution">
    <v-chip label :color="isApproved ? 'green' : 'red' " text-color="white">{{ isApproved ? "Approved" : "Disapproved" }}</v-chip>
    <p class="caption">{{ timestamp }}</p>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from "vue-property-decorator";

import moment from "moment";
import LastVersionMixin from "@/components/TE/LastVersionMixin";

@Component({
  name: "Feedback"
})
export default class Feedback extends Mixins(LastVersionMixin) {
  @Prop() item!: any;
  @Prop() value!: string;

  get timestamp() {
    return moment(this.version.resolution.timestamp).format("D.MM.YYYY");
  }

  get isApproved() {
    return this.version.resolution.isApproved;
  }
}
</script>

<style scoped>
</style>
