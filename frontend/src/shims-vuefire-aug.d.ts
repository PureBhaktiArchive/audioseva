import Vue from "vue";
import Vuetify from "vuetify";

declare module "vue/types/options" {
  interface ComponentOptions<V extends Vue> {
    firebase?: any;
    vuetify?: typeof Vuetify;
  }
}

declare module "vue/types/vue" {
  interface Vue {
    [key: string]: any;
    $bindAsArray: any;
  }
}
