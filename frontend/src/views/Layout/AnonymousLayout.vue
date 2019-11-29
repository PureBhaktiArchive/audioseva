<template>
  <base-layout>
    <template slot="aboveRoute">
      <v-app-bar :clipped-left="$vuetify.breakpoint.lgAndUp" fixed app>
        <v-toolbar-title>
          <router-link to="/" tag="span" style="cursor: pointer">
            <span>Audio Seva</span>
          </router-link>
        </v-toolbar-title>
      </v-app-bar>
    </template>
  </base-layout>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import BaseLayout from "./BaseLayout.vue";

@Component({
  name: "AnonymousLayout",
  components: {
    BaseLayout
  }
})
export default class AnonymousLayout extends Vue {}
</script>

<style scoped></style>
