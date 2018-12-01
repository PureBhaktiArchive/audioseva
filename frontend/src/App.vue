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
        <v-list-group
          v-for="(item, index) in sidebarItems"
          :key="item.title"
          no-action
          :prepend-icon="item.icon"
          :value="index === 0"
          >
            <v-list-tile slot="activator">
              <v-list-tile-content>
                <v-list-tile-title>{{ item.title }}</v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>

            <v-list-tile
              v-for="nav in subNavigation"
              :key="`${item.title}-${nav}`"
              :to="`${item.path}/${nav.toLowerCase()}`"
            >
              <v-list-tile-content>
                <v-list-tile-title>{{ nav }}</v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>
        </v-list-group>
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

<script>
import { mapState, mapActions } from "vuex";

export default {
  data() {
    return {
      appTitle: "Audio Seva Backend",
      sidebar: false,
      subNavigation: ["Allot", "Statistics"],
      sidebarItems: [
        {
          title: "SQR",
          path: "/sqr",
          icon: this.$vuetify.icons.listening
        },
        {
          title: "Sound Engineering",
          path: "/se",
          icon: this.$vuetify.icons.sound
        }
      ]
    };
  },
  computed: {
    ...mapState("user", ["currentUser"])
  },
  methods: {
    ...mapActions("user", ["signOut"])
  }
};
</script>
