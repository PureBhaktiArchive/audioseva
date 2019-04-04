<template>
  <ul>
    <li v-for="(chunk, index) in item.trackEditing.chunks" :key="index">
      <a
        download
        :href="getDownloadLink(index, 'link')"
      >
        {{ getDownloadLink(index, "display", "Loading link") }};
      </a>
      {{ chunk.beginning }}-{{ chunk.ending }}
    </li>
  </ul>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import _ from "lodash";
import firebase from "firebase/app";
import "firebase/storage";

import { getListId } from "@/utility";

@Component({
  name: "TaskDefinition"
})
export default class TaskDefinition extends Vue {
  @Prop() item!: any;
  downloadLinks: any = {};

  getDownloadLink(index: number, path: string, defaultValue = "") {
    return _.get(this.downloadLinks, `${index}.${path}`, defaultValue);
  }

  mounted() {
    let i;
    for (i = 0; i < this.item.trackEditing.chunks.length; i++) {
      this.getLink(this.item.trackEditing.chunks[i].fileName, i);
    }
  }

  async getLink(fileName: string, index: number) {
    this.$set(this.downloadLinks, index, { link: "", display: "Loading link" });
    const listId = getListId(fileName);
    let displayMessage;
    const gsRef = await firebase
      .storage()
      .refFromURL(
        `gs://original.${
          process.env.VUE_APP_STORAGE_ROOT_DOMAIN
        }/${listId}/${fileName}.flac`
      )
      .getDownloadURL()
      .catch(e => {
        displayMessage =
          e.code === "storage/object-not-found" ? "Missing file" : e.message;
      });
    if (gsRef) displayMessage = fileName;
    this.$set(this.downloadLinks, index, {
      link: gsRef ? gsRef : "",
      display: displayMessage
    });
  }
}
</script>

<style scoped>
</style>
