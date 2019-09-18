/*
 * sri sri guru gauranga jayatah
 */

import firebase from "firebase/app";
import _ from "lodash";
import Vue from "vue";
import Router, { NavigationGuard, RouteConfig } from "vue-router";

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
