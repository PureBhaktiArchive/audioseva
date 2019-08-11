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
          <span>{{ formatSeconds(chunk.beginning) }}&#8211;{{ formatSeconds(chunk.ending) }}</span>
        </v-flex>
        <v-flex sm12 md8 lg8 xl9>
          <unwanted-parts :item="chunk" />
        </v-flex>
      </v-layout>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import moment from "moment";
import UnwantedParts from "@/components/TE/UnwantedParts.vue";

import { getListId } from "@/utility";

@Component({
  name: "TaskDefinition",
  components: { UnwantedParts }
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
