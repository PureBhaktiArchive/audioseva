<template>
  <a v-if="downloadLink" :href="downloadLink" v-bind="$attrs"><slot></slot></a>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import firebase from "firebase/app";
import "firebase/storage";
import { getProjectDomain } from "@/utility";

@Component({
  name: "VersionDownloadLink"
})
export default class VersionDownloadLink extends Vue {
  @Prop() path!: string;
  bucket = firebase.app().storage(`te.uploads.${getProjectDomain()}`);
  downloadLink = "";

  async mounted() {
    this.downloadLink = await this.bucket
      .ref(this.path)
      .getDownloadURL()
      .catch(() => {});
  }
}
</script>

<style scoped></style>
