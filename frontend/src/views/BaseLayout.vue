<template>
  <v-app>
    <slot name="aboveContent"></slot>
    <v-content>
      <v-container fluid fill-height>
        <v-layout column>
          <slot name="aboveRoute"></slot>
          <router-view></router-view>
        </v-layout>
      </v-container>
    </v-content>
    <slot name="belowContent"></slot>
  </v-app>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component({
  name: "BaseLayout"
})
export default class BaseLayout extends Vue {}
</script>

<style scoped>
</style>
