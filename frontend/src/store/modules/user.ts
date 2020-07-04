/*
 * sri sri guru gauranga jayatah
 */

import { subjects } from '@/abilities';
import { router } from '@/router';
import { Ability, AbilityBuilder } from '@casl/ability';
import firebase from 'firebase/app';
import 'firebase/auth';
import _ from 'lodash';
import { ActionContext } from 'vuex';

export default {
  namespaced: true,
  state: {
    currentUser: null,
    roles: null,
    metadataCallback: null,
    metadataTimestamp: null,
  },
  getters: {
    isSignedIn: (state: any) => state.currentUser !== null,
    ability: () => {
      return new Ability([], {
        subjectName(subject) {
          if (!subject || typeof subject === 'string') return subject;

          return subject.modelName;
        },
      });
    },
    metadataRef: (state: any) => {
      return state.currentUser
        ? firebase.database().ref(`users/${state.currentUser.uid}/refreshTime`)
        : null;
    },
  },
  mutations: {
    setCurrentUser: (state: any, user: any) => {
      state.currentUser = user;
      if (!user) {
        router
          .push({
            path: '/login',
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
    setMetadataTimestamp: (state: any, timestamp: number) => {
      state.metadataTimestamp = timestamp;
    },
  },
  actions: {
    signOut() {
      firebase.auth().signOut();
    },
    async handleAuthStateChanged(
      { dispatch, commit, state, getters }: ActionContext<any, any>,
      user: firebase.User | null
    ) {
      commit('setCurrentUser', user);

      if (state.metadataCallback && getters.metadataRef) {
        getters.metadataRef.off('value', state.metadataCallback);
      }

      if (!state.currentUser) {
        commit('setMetadataCallback', null);
        commit('setMetadataTimestamp', null);
        await dispatch('updateUserRoles');
        return;
      }

      commit(
        'setMetadataCallback',
        (snapshot: firebase.database.DataSnapshot) => {
          const currentTimestamp = state.metadataTimestamp;
          const newTimestamp = snapshot.val();
          commit('setMetadataTimestamp', newTimestamp);
          if (currentTimestamp && currentTimestamp > newTimestamp) {
            return;
          }
          dispatch('updateUserRoles', { forceRefresh: true });
        }
      );
      getters.metadataRef.on('value', state.metadataCallback);
    },
    async updateUserRoles(
      { commit, getters, state }: ActionContext<any, any>,
      { forceRefresh = false } = {}
    ) {
      const roles = state.currentUser
        ? (await state.currentUser.getIdTokenResult(forceRefresh)).claims.roles
        : null;
      commit('setUserRoles', roles);

      const { rules, can, cannot } = new AbilityBuilder();
      const hasRole = (role: string) => _.get(state.roles, role) === true;

      // TE rules
      if (hasRole('TE.coordinator')) {
        can('manage', [subjects.TE.task, subjects.TE.tasks]);
      }

      if (hasRole('TE.checker')) {
        can(['resolve', 'view'], subjects.TE.task);
        can('view', subjects.TE.tasks);
      }
      if (hasRole('TE.editor')) {
        can(['upload', 'view'], subjects.TE.task);
        can('view', subjects.TE.myTasks);
      }

      // SQR abilities
      can('submit', subjects.SQR.form, { isMarkedDone: false });

      if (hasRole('SQR.coordinator')) {
        can('manage', [subjects.SQR.form, subjects.SQR.tasks]);
      }

      if (hasRole('SQR.checker')) {
        can('submit', subjects.SQR.form);
      }

      getters.ability.update(rules);
    },
  },
};
