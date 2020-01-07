/*
 * sri sri guru gauranga jayatah
 */

import firebase from "firebase/app";
import _ from "lodash";
import Vue from "vue";
import Router, { NavigationGuard, RouteConfig } from "vue-router";
import { store } from "@/store";

Vue.use(Router);

export const router = new Router({
  mode: "history",
  routes: [
    { path: "*", redirect: "/" },
    {
      path: "/",
      component: () => import("@/views/Layout/MainLayout.vue"),
      children: [
        {
          path: "",
          component: () => import("@/views/Home.vue")
        },
        {
          path: "login",
          component: () => import("@/views/Login.vue"),
          meta: { auth: { guestOnly: true } }
        },
        {
          path: "listen/:fileName",
          component: () => import("@/views/Listen.vue")
        },
        {
          path: "form/sound-quality-report/:fileName/:token",
          component: () => import("@/views/SQR/Form.vue")
        },
        {
          path: "form/donation/cash/:token",
          component: () => import("@/views/DonationReceiptForm.vue")
        },
        {
          path: "sqr/",
          component: () => import("@/views/SQR/SQR.vue"),
          meta: {
            activator: true,
            activatorName: "Sound Quality Reporting",
            menuIcon: "fas fa-headphones",
            auth: { roles: ["SQR.coordinator"] }
          },
          children: [
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
              meta: {
                menuItem: true,
                auth: { roles: ["TE.checker", "TE.coordinator"] },
                homePageLink: { text: "TE" }
              }
            },
            {
              path: "allot",
              component: () => import("@/views/TE/Allotment.vue"),
              meta: { menuItem: true, auth: { roles: ["TE.coordinator"] } }
            },
            {
              path: "my",
              component: () => import("@/views/TE/MyTasks.vue"),
              meta: {
                menuItem: true,
                menuLinkName: "My Tasks",
                auth: { roles: ["TE.editor", "TE.coordinator"] }
              }
            },
            {
              path: "upload",
              component: () => import("@/views/TE/Upload.vue"),
              meta: {
                menuItem: true,
                auth: { roles: ["TE.editor", "TE.coordinator"] },
                homePageLink: { text: "Upload" }
              }
            },
            {
              path: "tasks/:taskId",
              component: () => import("@/views/TE/Task.vue"),
              meta: {
                menuItem: false,
                auth: { roles: ["TE.checker", "TE.editor", "TE.coordinator"] }
              }
            }
          ]
        }
      ]
    }
  ]
});

const getRootRouteChildren = () => {
  return (router as any).options.routes.find(
    (route: RouteConfig) => route.path === "/"
  ).children;
};

export const filterRoutesByClaims = (
  filterCb: <T>(
    route: RouteConfig,
    parentRoles: string[] | undefined,
    ...args: any[]
  ) => any
) => (
  routes: RouteConfig[] = [],
  parentRoles: string[] | undefined = undefined,
  ...args: any[]
): RouteConfig[] => {
  return routes.reduce((filteredRoutes, route) => {
    const requiredRoles = _.get(route, "meta.auth.roles", parentRoles);

    const filteredRoute = filterCb<RouteConfig>(route, requiredRoles, ...args);
    filteredRoute && filteredRoutes.push(filteredRoute);
    return filteredRoutes;
  }, [] as RouteConfig[]);
};

const filterHomePageRoutes = filterRoutesByClaims(
  (route, requiredRoles): any => {
    const homePageButton = _.get(route, "meta.homePageLink", false);
    let filteredRoute: RouteConfig = route;
    if (route.children) {
      const routeChildren = filterHomePageRoutes(route.children, requiredRoles);
      filteredRoute = { ...route, children: routeChildren };
    }

    if (
      homePageButton &&
      requiredRoles &&
      store.getters["user/hasRole"](requiredRoles)
    ) {
      return filteredRoute;
    } else if (filteredRoute.children && filteredRoute.children.length) {
      filteredRoute = _.setWith(
        _.clone(filteredRoute),
        "meta.homePageLink",
        false,
        _.clone
      );
      return filteredRoute;
    }
  }
);

export const getHomePageRoutes = () => {
  return filterHomePageRoutes(getRootRouteChildren());
};

const filterMenuItems = filterRoutesByClaims(
  (route: RouteConfig, requiredRoles): any => {
    if (route.meta.activator) {
      const childRoutes = filterMenuItems(route.children, requiredRoles);
      if (childRoutes.length) return { ...route, children: childRoutes };
    } else if (requiredRoles && store.getters["user/hasRole"](requiredRoles)) {
      return route;
    } else if (!requiredRoles) {
      return route;
    }
  }
);

export const getMenuItems = () => {
  return filterMenuItems(
    getRootRouteChildren().filter((route: any) => {
      return route.meta && (route.meta.activator || route.meta.menuItem);
    })
  );
};

export const checkAuth: NavigationGuard = async (to, from, next) => {
  // reverse routes so nested routes can take control
  const restrictedRoute = [...to.matched]
    .reverse()
    .find(({ meta }) => meta.auth);

  if (!restrictedRoute) return next();

  const currentUser = firebase.auth().currentUser;
  const {
    meta: {
      auth: { requireAuth, guestOnly, roles }
    }
  } = restrictedRoute;

  if ((requireAuth || roles) && !currentUser)
    return next({
      path: "/login",
      query: { redirect: to.fullPath }
    });

  if (guestOnly && currentUser) return next("/");

  if (roles) {
    const userClaims = currentUser
      ? (await currentUser.getIdTokenResult()).claims.roles
      : null;

    return !userClaims || !store.getters["user/hasRole"](roles, userClaims)
      ? next("/")
      : next();
  }

  next();
};

export const redirectSections: NavigationGuard = async (to, from, next) => {
  if (!_.get(to, "meta.activator")) return next();

  const activatorChildren: RouteConfig[] = getRootRouteChildren().find(
    (route: RouteConfig) => `/${route.path}` === `${to.fullPath}/`
  ).children;
  const childRedirectRoute = activatorChildren.find(route => {
    const roles = _.get(route, "meta.auth.roles");
    return roles && store.getters["user/hasRole"](roles);
  });
  childRedirectRoute
    ? next(`${to.fullPath}/${childRedirectRoute.path}`)
    : next("/");
};

router.beforeEach(redirectSections);
router.beforeEach(checkAuth);
