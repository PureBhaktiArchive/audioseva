<template>
  <router-view></router-view>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component({
  name: "Users"
})
export default class Users extends Vue {}
</script>

<style scoped>
</style>
