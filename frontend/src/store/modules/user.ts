/*
 * sri sri guru gauranga jayatah
 */

import { router } from "@/router";
import firebase from "firebase/app";
import "firebase/auth";
import { ActionContext } from "vuex";
import _ from "lodash";
import { Ability } from "@casl/ability";
import { defineAbilities } from "@/abilities";

export default {
  namespaced: true,
  state: {
    currentUser: null,
    roles: null,
  },
  getters: {
    isSignedIn: (state: any) => state.currentUser !== null,
    hasRole: (state: any) => (roles: string | string[]) => {
      if (!state.roles) return false;
      if (typeof roles === "string") {
        return _.get(state.roles, roles);
      }
      return roles.some((role) => _.get(state.roles, role));
    },
    ability: () => {
      return new Ability([], {
        subjectName(subject) {
          if (!subject || typeof subject === "string") return subject;

          return subject.modelName;
        },
      });
    },
  },
  mutations: {
    setCurrentUser: (state: any, user: any) => {
      state.currentUser = user;
      if (!user) {
        router
          .push({
            path: "/login",
            query: { redirect: router.currentRoute.fullPath },
          })
          .catch(() => {
            // prevent uncaught promise error
          });
      }
    },
    setUserRoles: (state: any, roles: { [key: string]: any } | null) => {
      state.roles = roles;
    },
  },
  actions: {
    signOut() {
      firebase.auth().signOut();
    },
    async handleUser(
      { commit, dispatch }: ActionContext<any, any>,
      {
        user,
        refreshToken = false
      }: { user: firebase.User | null; refreshToken: boolean }
    ) {
      commit("setCurrentUser", user);
      if (user) {
        await dispatch(
          "updateUserRoles",
          (await user.getIdTokenResult(refreshToken)).claims.roles
        );
      } else {
        await dispatch("updateUserRoles", null);
      }
    },
    updateUserRoles(
      { commit, getters }: ActionContext<any, any>,
      roles: { [key: string]: any } | null
    ) {
      commit("setUserRoles", roles);
      getters.ability.update(defineAbilities());
    },
  },
};
