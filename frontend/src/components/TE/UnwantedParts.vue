<template>
  <div>
    <ul>
      <li
        v-for="(unwantedPart, key, index) in unwantedParts"
        :key="index"
      >{{ `${formatDurationUtc(unwantedPart.beginning, "mm:ss")}&ndash;${formatDurationUtc(unwantedPart.ending, "mm:ss")},
        ${unwantedPart.type}, ${unwantedPart.description || ""}` }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from "vue-property-decorator";
import FormatDurationUtc from "@/mixins/FormatDurationUtc";

@Component({
  name: "UnwantedParts"
})
export default class UnwantedParts extends Mixins(FormatDurationUtc) {
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
