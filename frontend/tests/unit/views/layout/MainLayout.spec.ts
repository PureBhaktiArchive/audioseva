import Vue from "vue";
import { createLocalVue, shallowMount } from "@vue/test-utils";
import VueRouter from "vue-router";
import MainLayout from "@/views/Layout/MainLayout.vue";
import { router } from "@/router";

describe("MainLayout", () => {
  let localVue: typeof Vue;

  beforeEach(() => {
    localVue = createLocalVue();
    localVue.use(VueRouter);
  });

  it("should render menu items based on TE claims", () => {
    const wrapper = shallowMount(MainLayout, {
      localVue,
      router,
      computed: {
        currentUser() {
          return {};
        }
      },
      methods: {
        signOut: () => {},
        getUserClaims: () => ({ TE: true })
      }
    });

    wrapper.vm.$nextTick(() => {
      expect(wrapper.vm.getMenuItems()).toMatchSnapshot();
    });
  });

  it("should render menu items based on coordinator claims", () => {
    const wrapper = shallowMount(MainLayout, {
      localVue,
      router,
      computed: {
        currentUser() {
          return {};
        }
      },
      methods: {
        signOut: () => {},
        getUserClaims: () => ({ coordinator: true })
      }
    });

    wrapper.vm.$nextTick(() => {
      expect(wrapper.vm.getMenuItems()).toMatchSnapshot();
    });
  });
});
