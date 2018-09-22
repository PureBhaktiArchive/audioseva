/*
 * sri sri guru gauranga jayatah
 */

import fb from "@/firebaseApp";

import Vue from "vue";
import VueResource from "vue-resource";

import App from "./App.vue";

import { router } from "@/router";
import { store } from "@/store";

import Vuetify from "vuetify";
import "vuetify/dist/vuetify.min.css";

import "@babel/polyfill";

Vue.use(VueResource);
Vue.use(Vuetify, {
  iconfont: "fa",
  icons: {
    listening: "fas fa-headphones",
    track: "fas fa-cut",
    quality: "fas fa-check"
  }
});

var unsubscribe = fb.auth().onAuthStateChanged(() => {
  new Vue({
    router,
    store,
    render: h => h(App)
  }).$mount("#app");

  unsubscribe();
});
