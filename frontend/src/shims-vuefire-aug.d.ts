import Vue from "vue";

declare module "vue/types/options" {
  interface ComponentOptions<V extends Vue> {
    firebase?: any;
  }
}

declare module "vue/types/vue" {
  interface Vue {
    [key: string]: any;
    $bindAsArray: any;
  }
}
