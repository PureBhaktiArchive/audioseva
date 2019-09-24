<template>
  <span>
    <v-btn :key="`${button.text}-${index}`" v-for="(button, index) in routeButtons" v-bind="button.props">
      {{ button.text }}
    </v-btn>
  </span>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { mapActions } from "vuex";
import { RouteConfig } from "vue-router";
import { getHomePageRoutes, getRouteChildren } from "@/router";

@Component({
  name: "HomePageButtons",
  methods: {
    ...mapActions("user", ["getUserClaims"])
  }
})
export default class RequireClaimsButtons extends Vue {
  userClaims: any = {};
  routeButtons: any[] = [];

  async mounted() {
    this.userClaims = (await this.getUserClaims()) || {};
    this.makeButtons(getHomePageRoutes(getRouteChildren(), this.userClaims));
  }

  makeButtons(routes: RouteConfig[], parentPath: string = "/") {
    const defaultButtonProps = {
      color: "primary"
    };
    routes.forEach(route => {
      const fullPath = `${parentPath}${route.path}`;
      if (route.meta.homePageLink) {
        this.routeButtons.push({
          text: route.meta.homePageLink.text,
          props: {
            ...defaultButtonProps,
            ...route.meta.homePageLink.props,
            to: fullPath
          }
        });
      }
      if (route.children) {
        this.makeButtons(route.children, fullPath);
      }
    });
  }
}
</script>

<style scoped>
</style>
