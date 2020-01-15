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
    hasRole: (state: any) => (roles: string | string[]) => {
      if (!state.roles) return false;
      if (typeof roles === "string") {
        return _.get(state.roles, roles);
      }
      return roles.some(role => _.get(state.roles, role));
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
    signOut({ dispatch }: ActionContext<any, any>) {
      firebase.auth().signOut();
      dispatch("updateUserRoles", null);
    },
    async handleUser(
      { commit }: ActionContext<any, any>,
      user: firebase.User | null
    ) {
      commit("setCurrentUser", user);
    },
    async updateUserRoles(
      { commit, rootGetters }: ActionContext<any, any>,
      roles: { [key: string]: any } | null
    ) {
      if (roles) {
        commit("setUserRoles", roles);
      }
      rootGetters.ability.update(defineAbilities());
    }
  }
};
