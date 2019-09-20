<template>
  <span>
    <v-btn :key="`${button.text}-${index}`" v-for="(button, index) in routeButtons" v-bind="button.props">
      {{ button.text }}
    </v-btn>
  </span>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import _ from "lodash";
import { mapActions } from "vuex";
import { RouteConfig } from "vue-router";
import { filterRoutesByClaims, hasClaim } from "@/router";

@Component({
  name: "RequireClaimsButtons",
  methods: {
    ...mapActions("user", ["getUserClaims"])
  }
})
export default class RequireClaimsButtons extends Vue {
  userClaims: any = {};
  routeButtons: any[] = [];

  async mounted() {
    this.userClaims = (await this.getUserClaims()) || {};
    this.makeButtons();
  }

  makeButtons() {
    const buttons: any[] = [];
    const defaultButtonProps = {
      color: "primary"
    };
    const filterCb = (
      route: RouteConfig,
      userClaims: any,
      requiredClaims: any,
      parentPath: string
    ): any => {
      const homePageButton = _.get(route, "meta.homePageLink", false);
      const fullPath = `${parentPath}${route.path}`;
      let buttonProps: any;
      if (homePageButton) {
        buttonProps = {
          text: homePageButton.text,
          props: {
            ...defaultButtonProps,
            ...homePageButton.props,
            to: fullPath
          }
        };
      }
      if (requiredClaims) {
        if (hasClaim(requiredClaims, userClaims) && homePageButton) {
          buttons.push(buttonProps);
        }
      } else if (homePageButton) {
        buttons.push(buttonProps);
      }
      if (route.children) {
        filterRoutesByClaims(filterCb)(
          route.children,
          userClaims,
          requiredClaims,
          fullPath
        );
      }
    };

    const routes = (this.$router as any).options.routes.find(
      (route: any) => route.path === "/"
    ).children;
    filterRoutesByClaims(filterCb)(routes, this.userClaims, false, "/");
    this.routeButtons = buttons;
  }
}
</script>

<style scoped>
</style>
