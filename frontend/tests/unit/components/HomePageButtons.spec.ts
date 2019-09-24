import Vue from "vue";
import firebase from "firebase/app";
import { createLocalVue, shallowMount } from "@vue/test-utils";
import VueRouter from "vue-router";
import flushPromises from "flush-promises";
import HomePageButtons from "@/components/HomePageButtons.vue";
import { router } from "@/router";

export const mockClaims = (claims: { [key: string]: any }) => {
  (firebase.auth as any).mockImplementation(() => ({
    currentUser: {
      getIdTokenResult: async () => {
        return {
          claims
        };
      }
    }
  }));
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
    mockClaims(claims);
    const wrapper = shallowMount(HomePageButtons, {
      localVue,
      router
    });
    await flushPromises();
    expect(wrapper.vm.routeButtons).toMatchSnapshot();
  });
});
