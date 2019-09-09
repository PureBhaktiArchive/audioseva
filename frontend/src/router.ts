/*
 * sri sri guru gauranga jayatah
 */

import firebase from "firebase/app";

import Vue from "vue";
import Router, { NavigationGuard, RouteConfig } from "vue-router";
import _ from "lodash";

Vue.use(Router);

export const router = new Router({
  mode: "history",
  routes: [
    { path: "*", redirect: "/" },
    {
      path: "/login",
      meta: { auth: { guestOnly: true } },
      component: () => import("@/views/Layout/MainLayout.vue"),
      children: [
        {
          path: "",
          component: () => import("@/views/Login.vue")
        }
      ]
    },
    {
      path: "/form/donation/cash/:token",
      component: () => import("@/views/Layout/AnonymousLayout.vue"),
      children: [
        {
          path: "",
          component: () => import("@/views/DonationReceiptForm.vue")
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
      path: "/form/sound-quality-report/:fileName/:token",
      component: () => import("@/views/Layout/AnonymousLayout.vue"),
      children: [
        {
          path: "",
          component: () => import("@/views/SQR/Form.vue")
        }
      ]
    },
    {
      path: "/",
      meta: { auth: { requireAuth: true } },
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
          path: "cr/",
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
              component: () => import("@/views/CRAllotment.vue"),
              meta: { menuItem: true }
            },
            {
              path: "allot-new",
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
              component: () => import("@/views/SQRAllotment.vue"),
              meta: { menuItem: true }
            },
            {
              path: "allot-new",
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
          path: "te/",
          component: () => import("@/views/TE/TE.vue"),
          meta: {
            activator: true,
            activatorName: "Track Editing",
            menuIcon: "fas fa-cut"
          },
          children: [
            {
              path: "tasks",
              component: () => import("@/views/TE/Tasks.vue"),
              meta: { menuItem: true }
            },
            {
              path: "allot",
              component: () => import("@/views/TE/Allotment.vue"),
              meta: { menuItem: true }
            },
            {
              path: "my",
              component: () => import("@/views/TE/MyTasks.vue"),
              meta: { menuItem: true, menuLinkName: "My Tasks" }
            },
            {
              path: "upload",
              component: () => import("@/views/TE/Upload.vue"),
              meta: { menuItem: true, auth: { requireClaims: { TE: true } } }
            },
            {
              path: "tasks/:taskId",
              component: () => import("@/views/TE/Task.vue"),
              meta: {
                menuItem: false,
                requireClaims: { TE: true, coordinator: true }
              }
            }
          ]
        },
        {
          path: "se/",
          component: () => import("@/views/SE/SE.vue"),
          meta: {
            activator: true,
            activatorName: "Sound Engineering",
            menuIcon: "fas fa-music"
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

export const hasClaim = (
  requiredClaims: { [key: string]: any },
  userClaims: { [key: string]: any }
) => {
  return Object.entries(requiredClaims).some(
    ([claimName, claimValue]) => userClaims[claimName] === claimValue
  );
};

export const filterRoutesByClaims = (
  routes: RouteConfig[] = [],
  userClaims: { [key: string]: any },
  requireParentClaims: boolean | { [key: string]: any } = false
) => {
  return routes.reduce(
    (filteredRoutes, route) => {
      const requireClaims = _.get(
        route,
        "meta.auth.requireClaims",
        requireParentClaims
      );

      if (route.meta.activator) {
        const childRoutes = filterRoutesByClaims(
          route.children,
          userClaims,
          requireClaims || requireParentClaims
        );
        childRoutes.length &&
          filteredRoutes.push({ ...route, children: childRoutes });
      } else if (requireClaims) {
        hasClaim(requireClaims, userClaims) && filteredRoutes.push(route);
      } else {
        filteredRoutes.push(route);
      }
      return filteredRoutes;
    },
    [] as RouteConfig[]
  );
};

export const routerBeforeEach: NavigationGuard = async (to, from, next) => {
  // reverse routes so nested routes can take control
  const restrictedRoute = [...to.matched]
    .reverse()
    .find(({ meta }) => meta.auth);

  if (!restrictedRoute) return next();

  const currentUser = firebase.auth().currentUser;
  const {
    meta: {
      auth: { requireAuth, guestOnly, requireClaims }
    }
  } = restrictedRoute;

  if (requireAuth && !currentUser)
    return next({
      path: "/login",
      query: { redirect: to.fullPath }
    });

  if (guestOnly && currentUser) return next("/");

  if (requireClaims) {
    const userClaims = currentUser
      ? (await currentUser.getIdTokenResult()).claims
      : null;

    return !userClaims || !hasClaim(requireClaims, userClaims)
      ? next("/")
      : next();
  }

  next();
};

router.beforeEach(routerBeforeEach);
