<template>
  <div>
    <router-view></router-view>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component({
  name: "SQR",
})
export default class SQR extends Vue {}
</script>

<style scoped></style>
