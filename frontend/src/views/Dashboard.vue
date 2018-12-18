/*
 * sri sri guru gauranga jayatah
 */

<template>
  <main-layout>
    <template slot="aboveRoute">
      <v-breadcrumbs :items="breadcrumbs" divider=">"></v-breadcrumbs>
    </template>
  </main-layout>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import MainLayout from "@/views/MainLayout.vue";
import _ from "lodash";

const pathMap = {
  sqr: "SQR",
  allot: "Allotment"
};

@Component({
  name: "Dashboard",
  components: {
    MainLayout
  }
})
export default class Dashboard extends Vue {
  breadcrumbs: any[] = [];

  @Watch("$route", { immediate: true, deep: true })
  getBreadcrumbs({ path, params }: any) {
    const breadcrumbs: any[] = [];
    if (path !== "/") {
      const paths = path.split("/");
      const pathsLength = paths.length - 1;
      paths.forEach((item: string, index: number) => {
        breadcrumbs.push({
          text: this.getText(item, params),
          disabled: index === pathsLength,
          to: this.getPath(item, index),
          exact: true
        });
      });
    }
    this.breadcrumbs = breadcrumbs;
  }

  getPath(item: string, index: number) {
    if (item) {
      if (index === 1) {
        return `/${item}`;
      } else {
        return item;
      }
    } else {
      return "/";
    }
  }

  getText(path: string, params: any) {
    if (path) {
      let customText = _.get(pathMap, path, _.capitalize(path));
      if (typeof customText === "function") {
        customText = customText(params);
      }
      return customText;
    }
    return "Home";
  }
}
</script>
