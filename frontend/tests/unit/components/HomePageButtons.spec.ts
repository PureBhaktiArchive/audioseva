import Vue from "vue";
import { createLocalVue, shallowMount } from "@vue/test-utils";
import VueRouter from "vue-router";
import HomePageButtons from "@/components/HomePageButtons.vue";
import { router } from "@/router";

describe("HomePageButtons", () => {
  let localVue: typeof Vue;

  beforeEach(() => {
    localVue = createLocalVue();
    localVue.use(VueRouter);
  });

  it("should render buttons that match TE claims", () => {
    const wrapper = shallowMount(HomePageButtons, {
      localVue,
      router,
      methods: {
        getUserClaims: () => ({ TE: true })
      }
    });
    wrapper.vm.$nextTick(() => {
      expect(wrapper.vm.routeButtons).toMatchSnapshot();
    });
  });

  it("should render buttons that match coordinator claims", () => {
    const wrapper = shallowMount(HomePageButtons, {
      localVue,
      router,
      methods: {
        getUserClaims: () => ({ coordinator: true })
      }
    });
    wrapper.vm.$nextTick(() => {
      expect(wrapper.vm.routeButtons).toMatchSnapshot();
    });
  });
});
