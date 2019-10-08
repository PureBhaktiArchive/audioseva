<template>
  <div>
    <template v-for="(chunk, index) in item.chunks">
      <v-row class="wrap pb-1" :key="`${item['key']}-${index}-layout`">
        <v-col v-bind="layout.link">
          <div>
            <a
              download
              :href="getLink(chunk.fileName)"
            >
              {{chunk.fileName}}
            </a>
          </div>
        </v-col>
        <v-col v-bind="layout.duration">
          <span>{{ formatDurationUtc(chunk.beginning, "mm:ss") }}&ndash;{{ formatDurationUtc(chunk.ending, "mm:ss") }}</span>
        </v-col>
        <v-col v-bind="layout.unwantedParts">
          <div :style="{ whiteSpace: 'pre-wrap' }">{{ chunk.unwantedParts }}</div>
        </v-col>
      </v-row>
      <v-divider :key="`${item['key']}-${index}-divider`" class="mt-2 mb-2"></v-divider>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from "vue-property-decorator";
import FormatTime from "@/mixins/FormatTime";

@Component({
  name: "TaskDefinition"
})
export default class TaskDefinition extends Mixins<FormatTime>(FormatTime) {
  @Prop() item!: any;
  @Prop({
    default: () => ({
      link: {
        xs4: true,
        sm2: true,
        md2: true,
        xl1: true
      },
      duration: {
        xs8: true,
        sm2: true,
        md2: true,
        xl1: true
      },
      unwantedParts: {
        sm12: true,
        md8: true,
        lg8: true,
        xl9: true
      }
    })
  })
  layout!: { [key: string]: any };

  getLink(fileName: string) {
    return `/download/${
      this.item.isRestored ? "restored" : "original"
    }/${fileName}.flac`;
  }
}
</script>

<style scoped>
</style>
