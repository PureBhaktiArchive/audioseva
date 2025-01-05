<template>
  <v-app>
    <v-navigation-drawer
      fixed
      :clipped="$vuetify.breakpoint.lgAndUp"
      v-model="sidebar"
      app
      v-if="currentUser"
      width="300px"
    >
      <v-list class="pa-0">
        <v-list-item>
          <v-list-item-avatar>
            <img :src="currentUser.photoURL" />
          </v-list-item-avatar>
          <v-list-item-content>
            <v-list-item-title>{{ currentUser.displayName }}</v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>
            <v-btn color="rgba(0, 0, 0, 0.87)" icon ripple @click="signOut">
              <v-icon>fas fa-sign-out-alt</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list>
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
      <v-app-bar-nav-icon
        @click="sidebar = !sidebar"
        v-if="currentUser"
      ></v-app-bar-nav-icon>
      <v-toolbar-title>
        <router-link to="/" tag="span" style="cursor: pointer">{{
          appTitle
        }}</router-link>
      </v-toolbar-title>
    </v-app-bar>
    <v-content>
      <v-container fluid>
        <v-breadcrumbs
          v-if="breadcrumbs.length"
          :items="breadcrumbs"
          divider=">"
        ></v-breadcrumbs>
        <router-view></router-view>
      </v-container>
    </v-content>
  </v-app>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import _ from 'lodash';
import { mapState, mapActions } from 'vuex';
import { RouteConfig } from 'vue-router';
import { getMenuItems } from '@/router';
import MenuLinks from '@/components/MenuLinks';

const pathMap = {
  cr: 'CR',
  sqr: 'SQR',
  te: 'TE',
  allot: 'Allotment',
};

@Component({
  name: 'MainLayout',
  components: {
    MenuLinks,
  },
  computed: {
    ...mapState('user', ['currentUser', 'roles']),
  },
  methods: {
    ...mapActions('user', ['signOut']),
  },
})
export default class MainLayout extends Vue {
  appTitle = 'Audio Seva';
  sidebar = false;
  menuItems: RouteConfig[] = [];
  breadcrumbs: any[] = [];

  @Watch('roles', { immediate: true })
  handleUserRolesChange(newRoles: { [key: string]: any } | null) {
    if (newRoles) {
      this.menuItems = getMenuItems();
    } else {
      this.menuItems = [];
    }
  }

  @Watch('$route', { immediate: true, deep: true })
  getBreadcrumbs({ path, params, matched }: any) {
    const breadcrumbs: any[] = [];
    const auth = _.get(
      [...matched].reverse().find(({ meta }) => meta.auth),
      'meta.auth'
    );
    if (path !== '/' && auth && (auth.ability || auth.requireAuth)) {
      const paths = path.split('/');
      const pathsLength = paths.length - 1;
      paths.forEach((item: string, index: number) => {
        breadcrumbs.push({
          text: this.getText(item, params),
          disabled: index === pathsLength,
          to: this.getPath(item, index, paths),
          exact: true,
        });
      });
    }
    this.breadcrumbs = breadcrumbs;
  }

  getPath(item: string, index: number, paths: string[]) {
    return `${paths.slice(0, index).join('/')}/${item}`;
  }

  getText(path: string, params: any) {
    if (path) {
      let customText = _.get(
        pathMap,
        path,
        path[0].toUpperCase() + path.substring(1)
      );
      if (typeof customText === 'function') {
        customText = (customText as Function)(params);
      }
      return customText;
    }
    return 'Home';
  }

  getActiveClass(path: string) {
    return this.$route.path.includes(path.substring(0, path.length - 1))
      ? 'primary--text'
      : 'inactive-menu';
  }
}
</script>

<style scoped>
>>> .inactive-menu {
  color: rgba(0, 0, 0, 0.87);
}

>>> .v-content__wrap {
  display: flex;
}
</style>
