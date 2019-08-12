<template>
  <div>
    <p class="font-weight-bold mb-0">{{ item[".key"] }}</p>
    <ul>
      <li
        v-for="(unwantedPart, key, index) in item.unwantedParts"
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
  @Prop() item!: any;
  @Prop() value!: string;
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
