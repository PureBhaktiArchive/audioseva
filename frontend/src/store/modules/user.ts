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
    isSignedIn: state => state.currentUser !== null
  },
  mutations: {
    setCurrentUser: (state, user) => {
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
