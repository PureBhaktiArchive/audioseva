<template>
  <ul>
    <li v-for="(chunk, index) in item.trackEditing.chunks" :key="index">
      <a
        download
        :href="getLink(chunk.fileName)"
      >
        {{ chunk.fileName }}
      </a>
      ; {{ formatSeconds(chunk.beginning) }}-{{ formatSeconds(chunk.ending) }}
    </li>
  </ul>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import moment from "moment";

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

  formatSeconds(seconds: number) {
    return moment
      .utc(moment.duration(seconds, "seconds").asMilliseconds())
      .format("mm:ss");
  }
}
</script>

<style scoped>
</style>
