<template>
  <div>
    <v-btn
      class="mx-2"
      :key="`${button.text}-${index}`"
      v-for="(button, index) in routeButtons"
      v-bind="button.props"
    >
      {{ button.text }}
    </v-btn>
  </div>
</template>

<script lang="ts">
import { Component, Watch, Vue } from 'vue-property-decorator';
import { RouteConfig } from 'vue-router';
import { mapState } from 'vuex';
import { getHomePageRoutes } from '@/router';

@Component({
  name: 'HomePageButtons',
  computed: {
    ...mapState('user', ['roles']),
  },
})
export default class HomePageButtons extends Vue {
  routeButtons: any[] = [];

  @Watch('roles', { immediate: true })
  handleUserRoles(newRoles: { [key: string]: any } | null) {
    this.routeButtons = [];
    if (newRoles) {
      this.makeButtons(getHomePageRoutes());
    }
  }

  makeButtons(routes: RouteConfig[], parentPath: string = '/') {
    const defaultButtonProps = {
      color: 'primary',
    };
    routes.forEach((route) => {
      const fullPath = `${parentPath}${route.path}`;
      if (route.meta?.homePageLink) {
        this.routeButtons.push({
          text: route.meta.homePageLink.text,
          props: {
            ...defaultButtonProps,
            ...route.meta.homePageLink.props,
            to: fullPath,
          },
        });
      }
      if (route.children) {
        this.makeButtons(route.children, fullPath);
      }
    });
  }
}
</script>

<style scoped></style>
