<template>
  <div>
    <template v-for="(chunk, index) in item.chunks">
      <v-row class="wrap pb-1" :key="`${item['key']}-${index}-layout`">
        <v-col v-bind="layout.link">
          <a :href="'/download/' + chunk.fileName" class="mr-2">
            {{ chunk.fileName }}</a
          >
          <restored-chip :isRestored="item.isRestored"></restored-chip>
        </v-col>
        <v-col v-bind="layout.duration">
          <span
            >{{ formatDurationUtc(chunk.beginning, 'HH:mm:ss') }}&ndash;{{
              formatDurationUtc(chunk.ending, 'HH:mm:ss')
            }}</span
          >
        </v-col>
        <v-col v-bind="layout.unwantedParts">
          <div
            :style="{ whiteSpace: 'pre-wrap' }"
            v-text="chunk.unwantedParts"
          ></div>
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
import { Component, Prop, Mixins } from 'vue-property-decorator';
import FormatTime from '@/mixins/FormatTime';
import RestoredChip from '@/components/TE/RestoredChip.vue';

@Component({
  name: 'TaskDefinition',
  components: { RestoredChip },
})
export default class TaskDefinition extends Mixins<FormatTime>(FormatTime) {
  @Prop() item!: any;
  @Prop({
    default: () => ({
      link: {
        cols: '4',
        sm: '2',
        md: '2',
        xl: '1',
      },
      duration: {
        cols: '8',
        sm: '4',
        md: '2',
        xl: '1',
      },
      unwantedParts: {
        cols: '12',
        md: '8',
        xl: '9',
      },
    }),
  })
  layout!: { [key: string]: any };
}
</script>

<style scoped></style>
