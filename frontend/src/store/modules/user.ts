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
  },
  actions: {
    signOut() {
      firebase.auth().signOut();
    },
    async handleUser(
      { commit, getters, state }: ActionContext<any, any>,
      user: firebase.User | null
    ) {
      commit('setCurrentUser', user);
      commit(
        'setUserRoles',
        user ? (await user.getIdTokenResult()).claims.roles : null
      );
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
