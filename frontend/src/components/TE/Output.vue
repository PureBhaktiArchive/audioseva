<template>
  <div>
    <a :href="version.uploadPath">Download</a>
    <p>{{ timestamp }}</p>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from "vue-property-decorator";
import moment from "moment";
import LastVersionMixin from "@/components/TE/LastVersionMixin";

@Component({
  name: "Output"
})
export default class Output extends Mixins<LastVersionMixin>(LastVersionMixin) {
  @Prop() item!: any;
  @Prop() value!: string;

  get timestamp() {
    return moment(this.version.timestamp).format("D.MM.YYYY");
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
