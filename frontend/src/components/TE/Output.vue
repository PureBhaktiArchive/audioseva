<template>
  <div v-if="item.versions">
    <span
      >Version {{ versionNumber }}:
      <version-download-link :path="lastVersion.uploadPath">
        {{ item[".key"] }}
      </version-download-link>
    </span>
    <p class="subtext">{{ timestamp }}</p>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from "vue-property-decorator";
import LastVersionMixin from "@/components/TE/LastVersionMixin";
import FormatTime from "@/mixins/FormatTime";
import VersionDownloadLink from "@/components/TE/VersionDownloadLink.vue";

@Component({
  name: "Output",
  components: { VersionDownloadLink }
})
export default class Output extends Mixins<LastVersionMixin, FormatTime>(
  LastVersionMixin,
  FormatTime
) {
  @Prop() item!: any;
  @Prop() value!: string;

  get timestamp() {
    return this.formatTimestamp(this.lastVersion.timestamp);
  }

  get versionNumber() {
    return Object.keys(this.item.versions).length;
  }
}
</script>

<style scoped></style>
