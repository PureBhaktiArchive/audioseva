<template>
  <v-expansion-panels class="pt-3">
    <v-expansion-panel>
      <v-expansion-panel-header class="pl-0">Guidelines</v-expansion-panel-header>
      <v-expansion-panel-content>
        <slot></slot>
      </v-expansion-panel-content>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component({
  name: "Guidelines"
})
export default class GuideLines extends Vue {}
</script>

<style scoped>
</style>
