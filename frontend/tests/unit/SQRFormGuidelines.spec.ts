import Guidelines from '@/components/SQRForm/Guidelines.vue';
import vuetifyOptions from '@/vuetifyOptions';
import { createLocalVue, mount } from '@vue/test-utils';
import Vue from 'vue';
import Vuetify from 'vuetify';

const localVue = createLocalVue();

describe('SQRFormGuidelines', () => {
  it('should render', async () => {
    const wrapper = mount(Guidelines, {
      localVue,
      vuetify: new Vuetify(vuetifyOptions),
      slots: { default: 'Guidelines text here' },
    });
    wrapper.find('button').trigger('click');
    await Vue.nextTick();
    expect(wrapper.html()).toMatchSnapshot();
  });
});
