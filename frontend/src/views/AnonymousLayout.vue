<template>
  <base-layout>
  </base-layout>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import BaseLayout from "@/views/BaseLayout.vue";

@Component({
  name: "AnonymousLayout",
  components: {
    BaseLayout
  }
})
export default class AnonymousLayout extends Vue {}

</script>

<style scoped>

</style>