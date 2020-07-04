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
  let vuetify: typeof Vuetify;

  beforeEach(() => {
    localVue = createLocalVue();
    localVue.use(VueRouter);
    vuetify = new Vuetify(vuetifyOptions);
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
        vuetify,
        computed: {
          currentUser() {
            return {};
          },
          roles() {
            return claims;
          },
        },
        methods: {
          signOut: () => {},
        },
      });
      await flushPromises();
      expect((wrapper.vm as any).menuItems).toMatchSnapshot();
    }
  );
});
