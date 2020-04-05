<template>
  <a @click.stop download :href="downloadLink" v-bind="$attrs"><slot></slot></a>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "VersionDownloadLink",
})
export default class VersionDownloadLink extends Vue {
  @Prop() taskId!: string;
  @Prop() versionId!: string;

  get downloadLink() {
    return `/te/tasks/${this.taskId}/versions/${this.versionId}/file`;
  }
}
</script>

<style scoped></style>
