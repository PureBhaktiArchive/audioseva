import Vue from "vue";
import { createLocalVue, shallowMount } from "@vue/test-utils";
import VueRouter from "vue-router";
import flushPromises from "flush-promises";
import MainLayout from "@/views/Layout/MainLayout.vue";
import { router } from "@/router";
import { mockClaims } from "../../components/HomePageButtons.spec";

describe("MainLayout", () => {
  let localVue: typeof Vue;

  beforeEach(() => {
    localVue = createLocalVue();
    localVue.use(VueRouter);
  });

  test.each`
    claims
    ${{ TE: true }}
    ${{ coordinator: true }}
  `(
    "should render menu items that match claims $claims",
    async ({ claims }) => {
      await mockClaims(claims);
      const wrapper = shallowMount(MainLayout, {
        localVue,
        router,
        computed: {
          currentUser() {
            return {};
          }
        },
        methods: {
          signOut: () => {}
        }
      });
      await flushPromises();
      expect(wrapper.vm.menuItems).toMatchSnapshot();
    }
  );
});
