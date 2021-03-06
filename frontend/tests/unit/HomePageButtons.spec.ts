import HomePageButtons from '@/components/HomePageButtons.vue';
import { router } from '@/router';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import flushPromises from 'flush-promises';
import Vue from 'vue';
import VueRouter from 'vue-router';
import { mockClaims } from './helpers';

describe('HomePageButtons', () => {
  let localVue: typeof Vue;

  beforeEach(() => {
    localVue = createLocalVue();
    localVue.use(VueRouter);
  });

  test.each`
    claims
    ${{ TE: { editor: true } }}
    ${{ TE: { coordinator: true } }}
  `('should render buttons that match claims $claims', async ({ claims }) => {
    await mockClaims(claims);
    const wrapper = shallowMount(HomePageButtons, {
      localVue,
      router,
      computed: {
        roles() {
          return claims;
        },
      },
    });
    await flushPromises();
    expect((wrapper.vm as any).routeButtons).toMatchSnapshot();
  });
});
