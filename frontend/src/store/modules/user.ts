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
    setMetadataRef: (state: any, ref: any) => {
      state.metadataRef = ref;
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
      { dispatch, commit }: ActionContext<any, any>,
      user: firebase.User | null
    ) {
      commit("setCurrentUser", user);
      dispatch("handleMetadata");
    },
    async handleInitialUserLoad(
      { commit, dispatch }: ActionContext<any, any>,
      user: firebase.User | null
    ) {
      commit("setCurrentUser", user);
      await dispatch("updateUserRoles");
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
    },
    handleMetadata({ state, dispatch, commit }: ActionContext<any, any>) {
      if (state.metadataCallback && state.metadataRef) {
        commit("setTimestamp", null);
        state.metadataRef.off("value", state.metadataCallback);
      }
      if (!state.currentUser) {
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
      commit(
        "setMetadataRef",
        firebase.database().ref(`users/${state.currentUser.uid}/refreshTime`)
      );
      state.metadataRef.on("value", state.metadataCallback);
    }
  },
};
