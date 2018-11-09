/*
 * sri sri guru gauranga jayatah
 */

import { store } from "@/store";
import { router } from "@/router";
import fb from "@/firebaseApp";

fb.auth().onAuthStateChanged(user => {
  store.commit("user/setCurrentUser", user);
});

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
      if (!user)
        router.push({
          path: "/login",
          query: { redirect: router.currentRoute.fullPath }
        });
    }
  },
  actions: {
    signOut() {
      fb.auth().signOut();
    }
  }
};
