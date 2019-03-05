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
      component: () => import("@/views/Layout/MainLayout.vue"),
      children: [
        {
          path: "",
          component: () => import("@/views/Login.vue")
        }
      ]
    },
    {
      path: "/restricted",
      component: () => import("@/views/Layout/AnonymousLayout.vue"),
      meta: { accessDenied: true },
      children: [
        {
          path: "",
          component: () => import("@/views/RestrictedView.vue"),
          meta: { accessDenied: true }
        }
      ]
    },
    {
      path: "/sound-editing/:taskId/quality-check/feedback",
      component: () => import("@/views/Layout/AnonymousLayout.vue"),
      children: [
        {
          path: "",
          component: () => import("@/views/QCSubmissionForm.vue")
        }
      ]
    },
    {
      path: "/sound-editing/upload/:uploadCode",
      component: () => import("@/views/Layout/AnonymousLayout.vue"),
      children: [
        {
          path: "",
          component: () => import("@/views/SE/Upload.vue")
        }
      ]
    },
    {
      path: "/listen/:fileName",
      component: () => import("@/views/Layout/AnonymousLayout.vue"),
      children: [
        {
          path: "",
          component: () => import("@/views/Listen.vue")
        }
      ]
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
          path: "users",
          component: () => import("@/views/Users/List.vue"),
          meta: { menuItem: true, menuName: "People", menuIcon: "fas fa-users" }
        },
        {
          path: "reporting/content/",
          component: () => import("@/views/CR/CR.vue"),
          meta: {
            activator: true,
            activatorName: "Content Reporting",
            menuIcon: "far fa-file-audio"
          },
          children: [
            {
              path: "",
              component: () => import("@/views/CR/List.vue"),
              meta: { menuItem: true }
            },
            {
              path: "allot",
              component: () => import("@/views/CR/Allotment.vue"),
              meta: { menuItem: true }
            }
          ]
        },
        {
          path: "sqr/",
          component: () => import("@/views/SQR/SQR.vue"),
          meta: {
            activator: true,
            activatorName: "Sound Quality Reporting",
            menuIcon: "fas fa-headphones"
          },
          children: [
            {
              path: "",
              component: () => import("@/views/SQR/Files.vue"),
              meta: { menuItem: true }
            },
            {
              path: "allot",
              component: () => import("@/views/SQR/Allotment.vue"),
              meta: { menuItem: true }
            },
            {
              path: "statistics",
              component: () => import("@/views/SQR/FileStatistics.vue"),
              meta: { menuItem: true }
            }
          ]
        },
        {
          path: "sound-editing/:taskId/quality-check/allot",
          component: () => import("@/views/QCAllotmentForm.vue")
        },
        {
          path: "se/",
          component: () => import("@/views/SE/SE.vue"),
          meta: {
            activator: true,
            activatorName: "Sound Engineering",
            menuIcon: "fas fa-music",
            role: "SE"
          },
          children: [
            {
              path: "",
              component: () => import("@/views/SE/Tasks.vue"),
              meta: { menuItem: true }
            },
            {
              path: "allot",
              component: () => import("@/views/SE/Allotment.vue"),
              meta: { menuItem: true }
            }
          ]
        }
      ]
    }
  ]
});

router.beforeEach(async (to, from, next) => {
  let currentUser = firebase.auth().currentUser;
  let requireAuth = to.matched.some(record => record.meta.requireAuth);
  let guestOnly = to.matched.some(record => record.meta.guestOnly);
  const userRoles = currentUser ? (await currentUser.getIdTokenResult()).claims : null;
  if (to.meta.accessDenied) return next();

  if (requireAuth && !currentUser)
    next({
      path: "/login",
      query: { redirect: to.fullPath }
    });
  else if (guestOnly && currentUser) next("/");
  // restrict route access based on user role
  else if (userRoles) {
    if (userRoles.Coordinator) {
      next();
    }
    else {
      // reverse routes so nested routes can restrict access
      const role = [...to.matched].reverse().find(({ meta }) => userRoles[meta.role]);
      if (role) next();
      else next({ path: "/restricted" })
    }
  }
  else next();
});
