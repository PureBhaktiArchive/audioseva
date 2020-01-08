<template>
  <div>
    <template v-for="(chunk, index) in item.chunks">
      <v-row class="wrap pb-1" :key="`${item['key']}-${index}-layout`">
        <v-col v-bind="layout.link">
          <v-badge v-if="item.isRestored" color="#2196F3">
            <template v-slot:badge>SEd</template>
            <a :href="getLink(chunk.fileName)">
              {{ chunk.fileName }}
            </a>
          </v-badge>
          <a v-else :href="getLink(chunk.fileName)">
            {{ chunk.fileName }}
          </a>
        </v-col>
        <v-col v-bind="layout.duration">
          <span
            >{{ formatDurationUtc(chunk.beginning, "HH:mm:ss") }}&ndash;{{
              formatDurationUtc(chunk.ending, "HH:mm:ss")
            }}</span
          >
        </v-col>
        <v-col v-bind="layout.unwantedParts">
          <!-- Needed so prettier doesn't add extra space at start of unwantedParts -->
          <!-- prettier-ignore -->
          <div :style="{ whiteSpace: 'pre-wrap' }">{{ chunk.unwantedParts }}</div>
        </v-col>
      </v-row>
      <v-divider
        :key="`${item['key']}-${index}-divider`"
        class="mt-2 mb-2"
      ></v-divider>
      <div
        :key="`${item['key']}-${index}-plus`"
        v-if="item.chunks.length !== index + 1"
        :style="{ fontSize: '2em', fontWeight: 'bold' }"
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
    }/${fileName}.${fileName.startsWith("DIGI") ? "mp3" : "flac"}`;
  }
}
</script>

<style scoped>
  >>> .v-badge__badge {
    right: -35px;
  }
</style>
