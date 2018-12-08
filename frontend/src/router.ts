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
      component: () => import("@/views/Login.vue")
    },
    {
      path: "/",
      meta: { requireAuth: true },
      component: () => import("@/views/Dashboard.vue"),
      children: [
        {
          path: "",
          component: () => import("@/views/Home.vue")
        },
        {
          path: "cr/allot",
          component: () => import("@/views/CRAllotment.vue")
        },
        {
          path: "sqr/",
          component: () => import("@/views/SQR.vue"),
          meta: { activator: true, activatorName: "Sound Quality Reporting", menuIcon: "fas fa-headphones" },
          children: [
            { path: "",
              component: () => import("@/views/SQRFiles.vue"),
              meta: { menuItem: true}
            },
            {
              path: "allot",
              component: () => import("@/views/SQRAllotment.vue"),
              meta: { menuItem: true }
            },
            { path: "statistics",
              component: () => import("@/views/SQRFileStatistics.vue"),
              meta: { menuItem: true }
            }
          ]
        },
        {
          path: "se/",
          component: () => import("@/views/SE/SE.vue"),
          meta: { activator: true, activatorName: "Sound Engineering", menuIcon: "fas fa-music" },
          children: [
            { path: "", component: () => import("@/views/SE/Tasks.vue"), meta: { menuItem: true } },
            { path: "allot", component: () => import("@/views/SE/Allotment.vue"), meta: { menuItem: true } }
          ]
        },
        {
          path: "te/allot",
          component: () => import("@/views/TEAllotment.vue")
        },
        {
          path: "te/fc/allot",
          component: () => import("@/views/TFCAllotment.vue")
        },
        {
          path: "/qc/allot",
          component: () => import("@/views/QCAllotment.vue")
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
