<template>
  <ul>
    <li v-for="(chunk, index) in item.trackEditing.chunks" :key="index">
      <a
        download
        :href="getLink(chunk.fileName)"
      >
        {{ chunk.fileName }};
      </a>
      {{ chunk.beginning }}-{{ chunk.ending }}
    </li>
  </ul>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { getListId } from "@/utility";

@Component({
  name: "TaskDefinition"
})
export default class TaskDefinition extends Vue {
  @Prop() item!: any;

  getLink(fileName: string) {
    const listId = getListId(fileName);
    return `https://original.${
      process.env.VUE_APP_STORAGE_ROOT_DOMAIN
    }/${listId}/${fileName}.flac`;
  }
}
</script>

<style scoped>
</style>
