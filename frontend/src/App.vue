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
        <v-list-tile
          v-for="item in sidebarItems"
          :key="item.title"
          :to="item.path">
          <v-list-tile-action>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>{{ item.title }}</v-list-tile-content>
        </v-list-tile>
        <v-divider></v-divider>
        <v-list-tile @click="signOut" v-if="currentUser">
          <v-list-tile-action>
            <v-icon left>fas fa-sign-out-alt</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>SignOut</v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-navigation-drawer>

    <v-toolbar app v-if="showHeader">
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

<script>
import { mapState, mapActions } from "vuex";

export default {
  data() {
    return {
      appTitle: "Audio Seva Backend",
      sidebar: false,
      showHeader: true,
      sidebarItems: [
        {
          title: "Allot Content Reporting",
          path: "/cr/allot",
          icon: this.$vuetify.icons.listening
        },
        {
          title: "SQR",
          path: "/sqr",
          icon: this.$vuetify.icons.listening
        },
        {
          title: "Sound Engineering",
          path: "/se",
          icon: this.$vuetify.icons.sound
        },
        {
          title: "Allot TE",
          path: "/te/allot",
          icon: this.$vuetify.icons.track
        },
        {
          title: "Allot TFC",
          path: "/te/fc/allot",
          icon: this.$vuetify.icons.quality
        },
        {
          title: "Allot QC",
          path: "/qc/allot",
          icon: this.$vuetify.icons.quality
        }
      ]
    };
  },
  computed: {
    ...mapState("user", ["currentUser"])
  },
  methods: {
    ...mapActions("user", ["signOut"])
  },
  watch: {
    '$route' (to) {
      if (to.path.includes("/sound-editing/upload")) {
        this.showHeader = false;
      }
    }
  }
};
</script>
