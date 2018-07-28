/*
 * sri sri guru gauranga jayatah
 */
import Vue from "vue";
import Octicon from "vue-octicon/components/Octicon.vue";

import App from "./App.vue";
import router from "./router";
import store from "./store";

import "../node_modules/bootstrap/scss/bootstrap.scss";
import "vue-octicon/icons";

Vue.component("octicon", Octicon);
Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");
