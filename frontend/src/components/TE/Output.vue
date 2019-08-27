<template>
  <div>
    <span>Version {{ item.versions.length }}: <a :href="version.uploadPath">{{ item[".key"] }}</a></span>
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
    return this.formatTimestamp(this.version.timestamp);
  }

  getLink(item: any) {
    return `https://te.uploads.${process.env.VUE_APP_PROJECT_DOMAIN}/${
      item.uploadPath
    }`;
  }
}
</script>

<style scoped>
</style>
