<template>
  <div>
    <ul>
      <template v-for="(unwantedPart, key, index) in unwantedParts">
        <li
          v-if="unwantedPart"
          :key="index"
        >{{ `${formatDurationUtc(unwantedPart.beginning, "mm:ss")}&ndash;${formatDurationUtc(unwantedPart.ending, "mm:ss")},
          ${unwantedPart.type}, ${unwantedPart.description || ""}` }}
        </li>
      </template>
    </ul>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from "vue-property-decorator";
import FormatTime from "@/mixins/FormatTime";

@Component({
  name: "UnwantedParts"
})
export default class UnwantedParts extends Mixins<FormatTime>(FormatTime) {
  @Prop({ default: () => [] })
  unwantedParts!: any[];
}
</script>

<style scoped>
ul {
  list-style-type: none;
}
li:before {
  content: "- ";
}
</style>
