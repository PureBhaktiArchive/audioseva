/*
 * sri sri guru gauranga jayatah
 */

import { router } from "@/router";
import firebase from "firebase/app";
import "firebase/auth";
import { ActionContext } from "vuex";
import _ from "lodash";

import { defineAbilities } from "@/abilities";

export default {
  namespaced: true,
  state: {
    currentUser: null,
    roles: null
  },
  getters: {
    isSignedIn: (state: any) => state.currentUser !== null,
    hasRole: (state: any) => (
      roles: string | string[],
      userRolesOverride: null | { [key: string]: any }
    ) => {
      const userRoles = userRolesOverride || state.roles;
      if (!userRoles) return false;
      if (typeof roles === "string") {
        return _.get(userRoles, roles);
      }
      return roles.some(role => _.get(userRoles, role));
    }
  },
  mutations: {
    setCurrentUser: (state: any, user: any) => {
      state.currentUser = user;
      if (!user) {
        router
          .push({
            path: "/login",
            query: { redirect: router.currentRoute.fullPath }
          })
          .catch(() => {
            // prevent uncaught promise error
          });
      }
    },
    setUserRoles: (state: any, roles: { [key: string]: any } | null) => {
      state.roles = roles;
    }
  },
  actions: {
    signOut({ commit, rootGetters }: ActionContext<any, any>) {
      firebase.auth().signOut();
      commit("setUserRoles", null);
      rootGetters.ability.update(defineAbilities());
    },
    async handleUser(
      { commit, rootGetters }: ActionContext<any, any>,
      user: firebase.User | null
    ) {
      commit("setCurrentUser", user);
      if (user) {
        commit("setUserRoles", (await user.getIdTokenResult()).claims.roles);
      }
      rootGetters.ability.update(defineAbilities());
    }
  }
};
