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
    metadataCallback: null,
    metadataRef: null,
    timestamp: null,
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
    metadataRef: (state: any) => {
      return state.currentUser
        ? firebase.database().ref(`users/${state.currentUser.uid}/refreshTime`)
        : null;
    }
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
    setMetadataCallback: (
      state: any,
      callback: ((snapshot: firebase.database.DataSnapshot) => void) | null
    ) => {
      state.metadataCallback = callback;
    },
    setTimestamp: (state: any, timestamp: number) => {
      state.timestamp = timestamp;
    }
  },
  actions: {
    signOut() {
      firebase.auth().signOut();
    },
    async onAuthStateChanged(
      { dispatch, commit, state, getters }: ActionContext<any, any>,
      user: firebase.User | null
    ) {
      commit("setCurrentUser", user);

      if (state.metadataCallback && getters.metadataRef) {
        commit("setTimestamp", null);
        getters.metadataRef.off("value", state.metadataCallback);
      }
      if (!state.currentUser) {
        commit("setMetadataCallback", null);
        commit("setTimestamp", null);
        await dispatch("updateUserRoles");
        return;
      }
      const callback = () => {
        if (!state.timestamp) {
          commit("setTimestamp", +new Date());
          return;
        }
        dispatch("updateUserRoles", { forceRefresh: true });
      };
      commit("setMetadataCallback", callback);
      getters.metadataRef.on("value", state.metadataCallback);
    },
    async updateUserRoles(
      { commit, getters, state }: ActionContext<any, any>,
      { forceRefresh = false } = {}
    ) {
      const roles = state.currentUser
        ? (await state.currentUser.getIdTokenResult(forceRefresh)).claims.roles
        : null;
      commit("setUserRoles", roles);
      getters.ability.update(defineAbilities());
    }
  },
};
