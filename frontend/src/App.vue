<template>
  <v-app>
    <v-navigation-drawer v-model="sidebar" app>
      <v-list>
        <v-list-tile
          v-for="item in sidebarItems"
          :key="item.title"
          :to="item.path">
          <v-list-tile-action>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>{{ item.title }}</v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-navigation-drawer>

    <v-toolbar app>
      <v-toolbar-side-icon @click="sidebar = !sidebar">
      </v-toolbar-side-icon>
      <v-toolbar-title>
        <router-link to="/" tag="span" style="cursor: pointer">
          {{ appTitle }}
        </router-link>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-toolbar-items class="hidden-xs-only">
        <v-btn
          flat
          v-for="item in toolbarItems"
          :key="item.title"
          :to="item.path">
          <v-icon left>{{ item.icon }}</v-icon>
          {{ item.title }}
        </v-btn>
      </v-toolbar-items>
    </v-toolbar>
    
    <v-content>
      <router-view></router-view>
    </v-content>
    
  </v-app>
</template>

<script>
export default {
  data() {
    return {
      appTitle: "Audio Seva Backend",
      sidebar: false,
      sidebarItems: [
        {
          title: "Allot Listening",
          path: "/cdr/allot",
          icon: this.$vuetify.icons.listening
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
      ],
      toolbarItems: []
    };
  }
};
</script>
