import { router } from '@/router';
import MainLayout from '@/views/Layout/MainLayout.vue';
import vuetifyOptions from '@/vuetifyOptions';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import flushPromises from 'flush-promises';
import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import { mockClaims } from '../../helpers';

describe('MainLayout', () => {
  let localVue: typeof Vue;

  beforeEach(() => {
    localVue = createLocalVue();
    localVue.use(VueRouter);
  });

  test.each`
    claims
    ${{ TE: { editor: true } }}
    ${{ SQR: { coordinator: true } }}
  `(
    'should render menu items that match claims $claims',
    async ({ claims }) => {
      await mockClaims(claims);
      const wrapper = shallowMount(MainLayout, {
        localVue,
        router,
        vuetify: new Vuetify(vuetifyOptions),
        computed: {
          currentUser() {
            return {};
          },
          roles() {
            return claims;
          },
        },
      });
      await flushPromises();
      expect((wrapper.vm as any).menuItems).toMatchSnapshot();
    }
  );
});
