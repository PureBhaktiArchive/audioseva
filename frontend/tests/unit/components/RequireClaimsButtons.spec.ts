import Vue from "vue";
import { mount, createLocalVue } from "@vue/test-utils";
import VueRouter from "vue-router";
import Vuetify from "vuetify";
import RequireClaimsButtons from "@/components/RequireClaimsButtons.vue";

const router = new VueRouter({
  mode: "history",
  routes: [
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
            menuIcon: "fas fa-headphones",
            auth: { requireClaims: { SQR: true } }
          },
          children: [
            {
              path: "",
              component: () => import("@/views/SQR/Files.vue"),
              meta: {
                menuItem: true,
                homePageLink: { text: "SQR" }
              }
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
              meta: {
                menuItem: true,
                homePageLink: { text: "Tasks" }
              }
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
              meta: {
                menuItem: true,
                auth: { requireClaims: { TE: true } },
                homePageLink: { text: "Upload" }
              }
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

Vue.use(Vuetify);

describe("RequireClaimsButtons", () => {
  it("should render buttons that match user claims", () => {
    const localVue = createLocalVue();
    localVue.use(VueRouter);
    const wrapper = mount(RequireClaimsButtons, {
      localVue,
      router,
      data: () => ({
        userClaims: { TE: true }
      }),
      methods: {
        getUserClaims: () => {}
      }
    });
    wrapper.vm.$nextTick(() => {
      expect(wrapper.vm.routeButtons).toMatchSnapshot();
    });
  });
});
