/*
 * sri sri guru gauranga jayatah
 */

import firebase from "firebase/app";

import Vue from "vue";
import Router from "vue-router";

Vue.use(Router);

export const router = new Router({
  mode: "history",
  routes: [
    { path: "*", redirect: "/" },
    {
      path: "/login",
      meta: { guestOnly: true },
      component: () => import("@/views/Login")
    },
    {
      path: "/",
      meta: { requireAuth: true },
      component: () => import("@/views/Dashboard"),
      children: [
        {
          path: "",
          component: () => import("@/views/Home")
        },
        {
          path: "cr/allot",
          component: () => import("@/views/CRAllotment")
        },
        {
          path: "sqr/allot",
          component: () => import("@/views/SQRAllotment")
        },
        {
          path: "te/allot",
          component: () => import("@/views/TEAllotment")
        },
        {
          path: "te/fc/allot",
          component: () => import("@/views/TFCAllotment")
        },
        {
          path: "/qc/allot",
          component: () => import("@/views/QCAllotment")
        }
      ]
    }
  ]
});

router.beforeEach((to, from, next) => {
  let currentUser = firebase.auth().currentUser;
  let requireAuth = to.matched.some(record => record.meta.requireAuth);
  let guestOnly = to.matched.some(record => record.meta.guestOnly);

  if (requireAuth && !currentUser)
    next({
      path: "/login",
      query: { redirect: to.fullPath }
    });
  else if (guestOnly && currentUser) next("/");
  else next();
});
