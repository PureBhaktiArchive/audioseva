<template>
  <base-layout>
    <template slot="aboveContent">
      <v-navigation-drawer
        fixed
        :clipped="$vuetify.breakpoint.lgAndUp"
        v-model="sidebar"
        app
        v-if="currentUser"
      >
        <v-toolbar flat class="transparent">
          <v-list class="pa-0">
            <v-list-tile avatar>
              <v-list-tile-avatar>
                <img :src="currentUser.photoURL">
              </v-list-tile-avatar>
              <v-list-tile-content>
                <v-list-tile-title>{{currentUser.displayName}}</v-list-tile-title>
              </v-list-tile-content>
              <v-list-tile-action>
                <v-btn icon ripple @click="signOut">
                  <v-icon>fas fa-sign-out-alt</v-icon>
                </v-btn>
              </v-list-tile-action>
            </v-list-tile>
          </v-list>
        </v-toolbar>
        <v-list dense expand>
          <v-divider></v-divider>
          <template v-for="(item, index) in routes">
            <v-list-group
              :key="index"
              v-if="item.meta && item.meta.activator"
              no-action
              :prepend-icon="item.meta.menuIcon"
              :value="index === 0"
            >
              <v-list-tile slot="activator">
                <v-list-tile-content>
                  <v-list-tile-title>{{ item.meta.activatorName }}</v-list-tile-title>
                </v-list-tile-content>
              </v-list-tile>
              <menu-links :parentRoute="item" :routes="item.children"></menu-links>
            </v-list-group>
            <v-list-tile
              :to="`/${item.path}`"
              v-else-if="item.meta.menuItem"
              :key="`no-nested-${index}`"
            >
              <v-list-tile-action>
                <v-icon>{{ item.meta.menuIcon }}</v-icon>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-title>{{ item.meta.menuName }}</v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>
          </template>
          <v-divider></v-divider>
          <v-list-tile @click="signOut" v-if="currentUser">
            <v-list-tile-action>
              <v-icon left>fas fa-sign-out-alt</v-icon>
            </v-list-tile-action>
            <v-list-tile-content>SignOut</v-list-tile-content>
          </v-list-tile>
          <v-list-tile class="hidden-md-and-up" @click="toggleConsole">
            <v-list-tile-content>Console</v-list-tile-content>
          </v-list-tile>
        </v-list>
      </v-navigation-drawer>

      <v-toolbar :clipped-left="$vuetify.breakpoint.lgAndUp" fixed app>
        <v-toolbar-side-icon @click="sidebar = !sidebar" v-if="currentUser"></v-toolbar-side-icon>
        <v-toolbar-title>
          <router-link to="/" tag="span" style="cursor: pointer">{{ appTitle }}</router-link>
        </v-toolbar-title>
      </v-toolbar>
    </template>
    <template slot="aboveRoute">
      <slot name="aboveRoute"></slot>
    </template>
  </base-layout>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { mapState, mapActions } from "vuex";
import BaseLayout from "./BaseLayout.vue";
import MenuLinks from "@/components/MenuLinks";

@Component({
  name: "MainLayout",
  components: {
    BaseLayout,
    MenuLinks
  },
  computed: {
    ...mapState("user", ["currentUser"])
  },
  methods: {
    ...mapActions("user", ["signOut"])
  }
})
export default class MainLayout extends Vue {
  appTitle = "Audio Seva";
  navLinks = [];
  sidebar = false;
  mobileConsoleSelector = document.querySelector(".mobileConsole_base");
  shouldShowConsole = "unset";
  previousBodyPadding = document.body.style.paddingBottom;

  mounted() {
    // shrink console at start
    // @ts-ignore
    mobileConsole.toggle();
    // hide console at start
    this.toggleConsole();
    // @ts-ignore
    this.navLinks = this.$router.options.routes.find(
      (route: any) => route.path === "/"
    ).children;
  }

  get routes(): any {
    // @ts-ignore
    return this.navLinks.filter((route: any) => {
      return route.meta && (route.meta.activator || route.meta.menuItem);
    });
  }

  toggleConsole() {
    this.shouldShowConsole =
      this.shouldShowConsole === "unset" ? "none" : "unset";
    (this.mobileConsoleSelector as any).style.display = this.shouldShowConsole;
    if (this.shouldShowConsole === "unset") {
      document.body.style.paddingBottom = this.previousBodyPadding;
    } else {
      this.previousBodyPadding = document.body.style.paddingBottom;
      document.body.style.paddingBottom = "0px";
    }
  }
}
</script>

<style scoped>
</style>
