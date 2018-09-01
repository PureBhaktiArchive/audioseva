/*
 * sri sri guru gauranga jayatah
 */
import Vue from "vue";
import Octicon from "vue-octicon/components/Octicon.vue";
import vSelect from "vue-select";
import VueResource from "vue-resource";

import App from "./App.vue";
import router from "./router";
import store from "./store";

import "../node_modules/bootstrap/scss/bootstrap.scss";
import "vue-octicon/icons";

Vue.component("octicon", Octicon);
Vue.component("v-select", vSelect);

Vue.use(VueResource);

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");
