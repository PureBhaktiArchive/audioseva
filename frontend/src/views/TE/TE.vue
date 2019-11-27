<template>
  <div>
    <router-view></router-view>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component({
  name: "TE"
})
export default class TE extends Vue {}
</script>

<style scoped></style>
