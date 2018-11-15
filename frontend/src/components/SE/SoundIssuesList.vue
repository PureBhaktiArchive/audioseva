<template>
  <ul>
    <li v-for="(value, key, index) in item.soundIssues" :key="index">
      {{ `${value.beginning}-${value.ending}: ${value.type}: ${value.description || ""}` }}
    </li>
  </ul>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "SoundIssuesList"
})
export default class SoundIssuesList extends Vue {
  @Prop() item!: any;
  @Prop() value!: string;
}
</script>

<style scoped>
</style>
