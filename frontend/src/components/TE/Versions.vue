<template>
  <div>
    <article v-for="(version, index) in versions" :key="index">
      <h3>Version: {{ index + 1 }}</h3>
      <p>
        {{ formatDurationUtc(version.timestamp, "MM-DD-YYYY hh:mm a", "ms") }}
        <a :href="version.uploadPath">File</a>
      </p>
      <p>
        {{ formatDurationUtc(version.resolution.timestamp, "MM-DD-YYYY hh:mm a", "ms") }}
        {{ version.resolution.feedback }}
      </p>
    </article>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from "vue-property-decorator";
import FormatDurationUtc from "@/mixins/FormatDurationUtc";

@Component({
  name: "Versions"
})
export default class Versions extends Mixins<FormatDurationUtc>(
  FormatDurationUtc
) {
  @Prop({ default: () => [] })
  versions!: any[];
}
</script>

<style scoped>
</style>
