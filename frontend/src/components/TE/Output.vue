<template>
  <div v-if="item.versions">
    <span>Version {{ item.versions.length }}: <a :href="lastVersionLink">{{ item[".key"] }}</a></span>
    <p class="subtext">{{ timestamp }}</p>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from "vue-property-decorator";
import LastVersionMixin from "@/components/TE/LastVersionMixin";
import FormatTime from "@/mixins/FormatTime";
import { teUploadPath } from "@/utility";

@Component({
  name: "Output"
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

  get lastVersionLink() {
    return `https://${teUploadPath}/${this.lastVersion.uploadPath}`;
  }
}
</script>

<style scoped>
</style>
