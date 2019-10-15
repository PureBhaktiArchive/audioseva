import Vue from "vue";
import { createLocalVue, shallowMount } from "@vue/test-utils";
import VueRouter from "vue-router";
import flushPromises from "flush-promises";
import HomePageButtons from "@/components/HomePageButtons.vue";
import { router } from "@/router";
import { store } from "@/store";

export const mockClaims = async (claims: { [key: string]: any }) => {
  await store.commit("user/setCurrentUser", {
    getIdTokenResult: () => ({ claims })
  });
};

describe("HomePageButtons", () => {
  let localVue: typeof Vue;

  beforeEach(() => {
    localVue = createLocalVue();
    localVue.use(VueRouter);
  });

  test.each`
    claims
    ${{ TE: true }}
    ${{ coordinator: true }}
  `("should render buttons that match claims $claims", async ({ claims }) => {
    await mockClaims(claims);
    const wrapper = shallowMount(HomePageButtons, {
      localVue,
      router
    });
    await flushPromises();
    expect(wrapper.vm.routeButtons).toMatchSnapshot();
  });
});
