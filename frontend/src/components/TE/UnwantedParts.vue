<template>
  <div>
    <ul>
      <li>{{ unwantedParts }}</li>
      <template v-for="(unwantedPart, index) in splitUnwantedParts">
        <li
          v-if="unwantedPart"
          :key="index"
        >
          {{ unwantedPart }}
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
  @Prop() unwantedParts!: string | undefined;

  get splitUnwantedParts() {
    return typeof this.unwantedParts === "string"
      ? this.unwantedParts.split("\n")
      : [];
  }
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
