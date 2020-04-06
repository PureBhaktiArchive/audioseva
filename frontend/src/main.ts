/*
 * sri sri guru gauranga jayatah
 */
import "core-js/stable";
import "regenerator-runtime/runtime";
import "whatwg-fetch";

import firebase from "firebase/app";
import "firebase/auth";

import Vue from "vue";
import VueResource from "vue-resource";

import App from "./App.vue";

import { router } from "@/router";
import { store } from "@/store";

import Vuetify from "vuetify";
import vuetifyOptions from "@/vuetifyOptions";
import "vuetify/dist/vuetify.min.css";

import { rtdbPlugin as VueFire } from "vuefire";
import VuePageTitle from "vue-page-title";
import { abilitiesPlugin } from "@casl/vue";
import { SubjectsPlugin } from "@/abilities";

import "@/styles/main.css";

Vue.use(VuePageTitle, {
  suffix: "| Audio Seva",
  setTitleMethod: (title: string) => {
    if (title.includes("Home |")) {
      document.title = "Audio Seva";
    } else {
      document.title = title;
    }
  },
});
Vue.use(VueResource);
Vue.use(VueFire);
Vue.use(Vuetify);
Vue.use(abilitiesPlugin, store.getters["user/ability"]);
Vue.use(SubjectsPlugin);

async function getFirebaseConfig(): Promise<Object> {
  return process.env.NODE_ENV === "production"
    ? /// loading config from Firebase Hosting reserved URL
      /// https://firebase.google.com/docs/hosting/reserved-urls#sdk_auto-configuration
      (await fetch("/__/firebase/init.json")).json()
    : {
        apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
        authDomain: process.env.VUE_APP_FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.VUE_APP_FIREBASE_DATABASE_URL,
        projectId: process.env.VUE_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.VUE_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VUE_APP_FIREBASE_MESSAGING_SENDER_ID,
      };
}

getFirebaseConfig().then((config) => {
  firebase.initializeApp(config);
  firebase.auth().onAuthStateChanged(async user => {
    store.dispatch("user/onAuthStateChanged", user);
  });

  const unsubscribe: any = firebase.auth().onAuthStateChanged(() => {
    new Vue({
      router,
      store,
      vuetify: new Vuetify(vuetifyOptions),
      firebase: {},
      render: (h) => h(App),
    }).$mount("#app");

    unsubscribe();
  });
});
