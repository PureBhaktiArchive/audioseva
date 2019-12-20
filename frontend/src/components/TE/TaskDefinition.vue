<template>
  <div>
    <template v-for="(chunk, index) in item.chunks">
      <v-row class="wrap pb-1" :key="`${item['key']}-${index}-layout`">
        <v-col v-bind="layout.link">
          <div>
            <a :href="getLink(chunk.fileName)">
              {{ chunk.fileName }}
            </a>
          </div>
        </v-col>
        <v-col v-bind="layout.duration">
          <span
            >{{ formatDurationUtc(chunk.beginning, "mm:ss") }}&ndash;{{
              formatDurationUtc(chunk.ending, "mm:ss")
            }}</span
          >
        </v-col>
        <v-col v-bind="layout.unwantedParts">
          <div :style="{ whiteSpace: 'pre-wrap' }">
            {{ chunk.unwantedParts }}
          </div>
        </v-col>
      </v-row>
      <v-divider
        :key="`${item['key']}-${index}-divider`"
        class="mt-2 mb-2"
      ></v-divider>
      <div
        :key="`${item['key']}-${index}-plus`"
        v-if="item.chunks.length !== index + 1"
      >
        +
      </div>
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
        cols: "4",
        sm: "2",
        md: "2",
        xl: "1"
      },
      duration: {
        cols: "8",
        sm: "4",
        md: "2",
        xl: "1"
      },
      unwantedParts: {
        cols: "12",
        md: "8",
        xl: "9"
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

<style scoped></style>
