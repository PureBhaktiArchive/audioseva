<template>
  <v-app>
    <v-navigation-drawer v-model="sidebar" app v-if="currentUser">
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
      <v-list dense>
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
        </template>
        <v-divider></v-divider>
        <v-list-tile @click="signOut" v-if="currentUser">
          <v-list-tile-action>
            <v-icon left>fas fa-sign-out-alt</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>SignOut</v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-navigation-drawer>

    <v-toolbar app>
      <v-toolbar-side-icon @click="sidebar = !sidebar" v-if="currentUser">
      </v-toolbar-side-icon>
      <v-toolbar-title>
        <router-link to="/" tag="span" style="cursor: pointer">
          {{ appTitle }}
        </router-link>
      </v-toolbar-title>
    </v-toolbar>
    
    <v-content>
      <router-view></router-view>
    </v-content>
    
  </v-app>
</template>

<script lang="ts">
import { mapState, mapActions } from "vuex";
import MenuLinks from "@/components/MenuLinks.ts";

export default {
  components: {
    MenuLinks
  },
  data() {
    return {
      appTitle: "Audio Seva",
      sidebar: false,
      navLinks: []
    };
  },
  mounted() {
    // @ts-ignore
    this.navLinks = this.$router.options.routes.find(
      (route: any) => route.path === "/"
    ).children;
  },
  computed: {
    ...mapState("user", ["currentUser"]),
    routes: function(): any {
      // @ts-ignore
      return this.navLinks.filter(
        (route: any) => route.meta && route.meta.activator
      );
    }
  },
  methods: {
    ...mapActions("user", ["signOut"])
  }
};
</script>
