<template>
  <div v-if="item.versions">
    <span>Version {{ versionNumber }}: <a :href="lastVersionLink">{{ item[".key"] }}</a></span>
    <p class="subtext">{{ timestamp }}</p>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from "vue-property-decorator";
import LastVersionMixin from "@/components/TE/LastVersionMixin";
import FormatTime from "@/mixins/FormatTime";

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
    return `/download/te.uploads/${this.lastVersion.uploadPath}`;
  }

  get versionNumber() {
    return Object.keys(this.item.versions).length;
  }
}
</script>

<style scoped>
</style>
