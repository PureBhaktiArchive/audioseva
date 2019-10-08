<template>
  <v-app>
    <slot name="aboveContent"></slot>
    <v-content>
      <v-container class="fill-height" fluid >
        <v-row>
          <v-col>
            <slot name="aboveRoute"></slot>
            <router-view></router-view>
          </v-col>
        </v-row>
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
