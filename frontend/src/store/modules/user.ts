/*
 * sri sri guru gauranga jayatah
 */

import { router } from "@/router";
import firebase from "firebase/app";
import "firebase/auth";

export default {
  namespaced: true,
  state: {
    currentUser: null
  },
  getters: {
    isSignedIn: (state: any) => state.currentUser !== null
  },
  mutations: {
    setCurrentUser: (state: any, user: any) => {
      state.currentUser = user;
      if (!user) {
        router.push({
          path: "/login",
          query: { redirect: router.currentRoute.fullPath }
        });
      }
    }
  },
  actions: {
    signOut() {
      firebase.auth().signOut();
    }
  }
};
