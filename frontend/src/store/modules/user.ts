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

let callback: ((snapshot: firebase.database.DataSnapshot) => void) | null;
let metadataRef: firebase.database.Reference | null;

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
      user: firebase.User | null
    ) {
      commit("setCurrentUser", user);
      dispatch("updateUserRoles", await dispatch("getUserRoles"));
    },
    updateUserRoles(
      { commit, getters }: ActionContext<any, any>,
      roles: { [key: string]: any } | null
    ) {
      commit("setUserRoles", roles);
      getters.ability.update(defineAbilities());
    },
    async getUserRoles(
      { state }: ActionContext<any, any>,
      refreshToken = false
    ) {
      if (!state.currentUser) return null;
      return (await state.currentUser.getIdTokenResult(refreshToken)).claims
        .roles;
    },
    handleMetaData({ state, dispatch }: ActionContext<any, any>) {
      if (callback && metadataRef) {
        metadataRef.off("value", callback);
      }
      if (state.currentUser) {
        callback = async () => {
          await dispatch("onMetaDataChange");
        };
        metadataRef = firebase
          .database()
          .ref(`users/${state.currentUser.uid}/refreshTime`);
        metadataRef.on("value", callback);
      }
    },
    async onMetaDataChange({ dispatch }: ActionContext<any, any>) {
      dispatch("updateUserRoles", await dispatch("getUserRoles", true));
    }
  },
};
