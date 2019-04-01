<template>
  <div>
    <p class="body-2 mb-0">{{ item.trackEditing.feedback }}</p>
    <p class="caption">{{ timestamp }}</p>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { formatTimestamp } from "@/utility";

@Component({
  name: "Feedback"
})
export default class Feedback extends Vue {
  @Prop() item!: any;
  @Prop() value!: string;

  get timestamp() {
    return formatTimestamp("trackEditing.feedbackTimestamp", this.item);
  }
}
</script>

<style scoped>
</style>
