<template>
  <a :href="fileLink" target="_blank" rel="noopener noreferrer">link</a>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "FileLink"
})
export default class FileLink extends Vue {
  @Prop() subDomain!: string;
  @Prop() filePath!: string;
  @Prop() item!: any;
  @Prop() value!: string;

  fileLink: any = null;

  mounted() {
    this.fileLink = `http://${this.subDomain}.${process.env.VUE_APP_STORAGE_ROOT_DOMAIN}/${this.filePath}.flac`;
  }
}
</script>

<style scoped></style>
