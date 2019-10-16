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
            <v-list-item>
              <v-list-item-avatar>
                <img :src="currentUser.photoURL">
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title>{{currentUser.displayName}}</v-list-item-title>
              </v-list-item-content>
              <v-list-item-action>
                <v-btn icon ripple @click="signOut">
                  <v-icon>fas fa-sign-out-alt</v-icon>
                </v-btn>
              </v-list-item-action>
            </v-list-item>
          </v-list>
        </v-toolbar>
        <v-list dense expand>
          <v-divider></v-divider>
          <template v-for="(item, index) in menuItems">
            <menu-links
              :parentRoute="item"
              :key="index"
              v-if="item.meta && item.meta.activator"
              :activeClass="getActiveClass(item.path)"
            >
            </menu-links>
            <v-list-item
              :to="`/${item.path}`"
              v-else-if="item.meta.menuItem"
              :key="`no-nested-${index}`"
              :active-class="getActiveClass(item.path)"
            >
              <v-list-item-icon>
                <v-icon v-text="item.meta.menuIcon"></v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>{{ item.meta.menuName }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </template>
          <v-divider></v-divider>
          <v-list-item @click="signOut" v-if="currentUser">
            <v-list-item-action>
              <v-icon left>fas fa-sign-out-alt</v-icon>
            </v-list-item-action>
            <v-list-item-content>SignOut</v-list-item-content>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>

      <v-app-bar :clipped-left="$vuetify.breakpoint.lgAndUp" fixed app>
        <v-app-bar-nav-icon @click="sidebar = !sidebar" v-if="currentUser"></v-app-bar-nav-icon>
        <v-toolbar-title>
          <router-link to="/" tag="span" style="cursor: pointer">{{ appTitle }}</router-link>
        </v-toolbar-title>
      </v-app-bar>
    </template>
    <template slot="aboveRoute">
      <slot name="aboveRoute"></slot>
    </template>
  </base-layout>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { mapState, mapActions } from "vuex";
import { RouteConfig } from "vue-router";
import { getMenuItems } from "@/router";
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
  sidebar = false;
  menuItems: RouteConfig[] = [];

  async mounted() {
    this.menuItems = await getMenuItems();
  }

  getActiveClass(path: string) {
    return this.$route.path.includes(path.substring(0, path.length - 1))
      ? "primary--text"
      : "inactive-menu";
  }
}
</script>

<style scoped>
>>> .inactive-menu {
  color: rgba(0, 0, 0, 0.87);
}
</style>
