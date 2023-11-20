/*
 * sri sri guru gauranga jayatah
 */

import { subjects } from '@/abilities';
import { store } from '@/store';
import _ from 'lodash';
import Vue from 'vue';
import Router, { NavigationGuard, RouteConfig } from 'vue-router';

Vue.use(Router);

export const router = new Router({
  mode: 'history',
  routes: [
    { path: '*', redirect: '/' },
    {
      path: '/',
      component: () => import('@/views/Layout/MainLayout.vue'),
      children: [
        {
          path: '',
          component: () => import('@/views/Home.vue'),
        },
        {
          path: 'login',
          component: () => import('@/views/Login.vue'),
          meta: { auth: { guestOnly: true } },
        },
        {
          path: 'listen/:fileName',
          component: () => import('@/views/Listen.vue'),
        },
        {
          path: 'form/sound-quality-report/:fileName/:token',
          component: () => import('@/views/SQR/Form.vue'),
        },
        {
          path: 'form/donation/cash/:token',
          component: () => import('@/views/DonationReceiptForm.vue'),
        },
        {
          path: 'sqr/',
          component: () => import('@/views/SQR/SQR.vue'),
          meta: {
            activator: true,
            activatorName: 'Sound Quality Reporting',
            menuIcon: 'fas fa-headphones',
          },
          children: [
            {
              path: 'allot',
              component: () => import('@/views/SQRAllotment.vue'),
              meta: {
                menuItem: true,
                auth: {
                  ability: { subject: subjects.SQR.tasks, action: 'allot' },
                },
              },
            },
          ],
        },
        {
          path: 'te/',
          component: () => import('@/views/TE/TE.vue'),
          meta: {
            activator: true,
            activatorName: 'Track Editing',
            menuIcon: 'fas fa-cut',
          },
          children: [
            {
              path: 'tasks',
              component: () => import('@/views/TE/Tasks.vue'),
              meta: {
                menuItem: true,
                auth: {
                  ability: {
                    subject: subjects.TE.tasks,
                    action: 'view',
                  },
                },
                homePageLink: { text: 'TE' },
              },
            },
            {
              path: 'allot',
              component: () => import('@/views/TE/Allotment.vue'),
              meta: {
                menuItem: true,
                auth: {
                  ability: {
                    subject: subjects.TE.tasks,
                    action: 'allot',
                  },
                },
              },
            },
            {
              path: 'my',
              component: () => import('@/views/TE/MyTasks.vue'),
              meta: {
                menuItem: true,
                menuLinkName: 'My Tasks',
                auth: {
                  ability: {
                    subject: subjects.TE.myTasks,
                    action: 'view',
                  },
                },
              },
            },
            {
              path: 'upload',
              component: () => import('@/views/TE/Upload.vue'),
              meta: {
                menuItem: true,
                auth: {
                  ability: {
                    subject: subjects.TE.task,
                    action: 'upload',
                  },
                },
                homePageLink: { text: 'Upload' },
              },
            },
            {
              path: 'tasks/:taskId',
              component: () => import('@/views/TE/Task.vue'),
              meta: {
                menuItem: false,
                auth: {
                  ability: {
                    subject: subjects.TE.task,
                    action: 'view',
                  },
                },
              },
            },
          ],
        },
      ],
    },
  ],
});

const getRootRouteChildren = (): any => {
  return (router as any).options.routes.find(
    (route: RouteConfig) => route.path === '/'
  ).children;
};

type RouteAbility = { action: string; subject: string };

export const filterRoutesByClaims =
  (
    filterCb: <T>(
      route: RouteConfig,
      parentAbility: RouteAbility | undefined,
      ...args: any[]
    ) => any
  ) =>
  (
    routes: RouteConfig[] = [],
    parentAbility: RouteAbility | undefined = undefined,
    ...args: any[]
  ): RouteConfig[] => {
    return routes.reduce((filteredRoutes, route) => {
      const ability = _.get(route, 'meta.auth.ability', parentAbility);

      const filteredRoute = filterCb<RouteConfig>(route, ability, ...args);
      filteredRoute && filteredRoutes.push(filteredRoute);
      return filteredRoutes;
    }, [] as RouteConfig[]);
  };

const filterHomePageRoutes = filterRoutesByClaims((route, ability): any => {
  const homePageButton = _.get(route, 'meta.homePageLink', false);
  let filteredRoute: RouteConfig = route;
  if (route.children) {
    const routeChildren = filterHomePageRoutes(route.children, ability);
    filteredRoute = { ...route, children: routeChildren };
  }

  if (
    homePageButton &&
    ability &&
    store.getters['user/ability'].can(ability.action, ability.subject)
  ) {
    return filteredRoute;
  } else if (filteredRoute.children && filteredRoute.children.length) {
    filteredRoute = _.setWith(
      _.clone(filteredRoute),
      'meta.homePageLink',
      false,
      _.clone
    );
    return filteredRoute;
  }
});

export const getHomePageRoutes = () => {
  return filterHomePageRoutes(getRootRouteChildren());
};

const filterMenuItems = filterRoutesByClaims(
  (route: RouteConfig, ability): any => {
    if (route.meta?.activator) {
      const childRoutes = filterMenuItems(route.children, ability);
      if (childRoutes.length) return { ...route, children: childRoutes };
    } else if (
      ability &&
      store.getters['user/ability'].can(ability.action, ability.subject)
    ) {
      return route;
    } else if (!ability) {
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

  const {
    meta: {
      auth: { requireAuth, guestOnly, ability },
    },
  } = restrictedRoute;

  if ((requireAuth || ability) && !store.getters['user/isSignedIn'])
    return next({
      path: '/login',
      query: { redirect: to.fullPath },
    });

  if (guestOnly && store.getters['user/isSignedIn']) return next('/');

  if (ability) {
    return store.getters['user/ability'].can(ability.action, ability.subject)
      ? next()
      : next('/');
  }

  next();
};

export const redirectSections: NavigationGuard = async (to, from, next) => {
  if (!_.get(to, 'meta.activator')) return next();

  const activatorChildren: RouteConfig[] = getRootRouteChildren().find(
    (route: RouteConfig) => `/${route.path}` === `${to.fullPath}/`
  ).children;
  const childRedirectRoute = activatorChildren.find((route) => {
    const ability = _.get(route, 'meta.auth.ability');
    return (
      ability &&
      store.getters['user/ability'].can(ability.action, ability.subject)
    );
  });
  childRedirectRoute
    ? next(`${to.fullPath}/${childRedirectRoute.path}`)
    : next('/');
};

router.beforeEach(async (to, from, next) => {
  // Make sure roles exist before "checkAuth" is run
  // This prevents "checkAuth" from redirecting to home page falsely
  if (store.getters['user/isSignedIn'] && from.name === null) {
    await store.dispatch('user/updateUserRoles');
  }
  next();
});
router.beforeEach(redirectSections);
router.beforeEach(checkAuth);
