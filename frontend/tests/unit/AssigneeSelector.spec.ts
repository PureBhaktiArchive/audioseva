import AssigneeSelector from '@/components/AssigneeSelector.vue';
import vuetifyOptions from '@/vuetifyOptions';
import { createLocalVue, mount } from '@vue/test-utils';
import Vuetify from 'vuetify';

const localVue = createLocalVue();

describe('AssigneeSelector', () => {
  it('should show message slot', () => {
    const wrapper = mount(AssigneeSelector, {
      localVue,
      vuetify: new Vuetify(vuetifyOptions),
      propsData: {
        messages: ['placeholder'],
      },
      slots: {
        message: "<div id='message-slot' />",
      },
    });
    expect(wrapper.find('#message-slot').exists()).toBe(true);
  });
});
