<template>
  <v-app>
    <slot name="aboveContent"></slot>
    <v-content>
      <v-container fluid>
        <slot name="aboveRoute"></slot>
        <router-view></router-view>
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
>>> .v-content__wrap {
  display: flex;
}
</style>
