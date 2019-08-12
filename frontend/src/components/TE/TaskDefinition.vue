<template>
  <div>
    <template v-for="(chunk, index) in item.chunks">
      <v-layout class="wrap pb-1" :key="index">
        <v-flex xs4 sm2 md2 xl1>
          <div>
            <a
              download
              :href="getLink(chunk.fileName)"
            >
              {{chunk.fileName}}
            </a>
          </div>
        </v-flex>
        <v-flex xs8 sm2 md2 xl1>
          <span>{{ formatDurationUtc(chunk.beginning, "mm:ss") }}&ndash;{{ formatDurationUtc(chunk.ending, "mm:ss") }}</span>
        </v-flex>
        <v-flex sm12 md8 lg8 xl9>
          <unwanted-parts :item="chunk" />
        </v-flex>
      </v-layout>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from "vue-property-decorator";
import UnwantedParts from "@/components/TE/UnwantedParts.vue";
import FormatDurationUtc from "@/mixins/FormatDurationUtc";

import { getListId } from "@/utility";

@Component({
  name: "TaskDefinition",
  components: { UnwantedParts }
})
export default class TaskDefinition extends Mixins(FormatDurationUtc) {
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
