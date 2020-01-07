/*
 * sri sri guru gauranga jayatah
 */

import Vue from "vue";
import Vuex from "vuex";

import user from "./modules/user";
import { Ability } from "@casl/ability";

Vue.use(Vuex);

export const store = new Vuex.Store({
  state: {},
  getters: {
    ability() {
      return new Ability([]);
    }
  },
  mutations: {},
  actions: {},
  modules: {
    user
  }
});
