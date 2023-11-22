import CancelListItem from '@/components/SQRForm/CancelListItem.vue';
import vuetifyOptions from '@/vuetifyOptions';
import { createLocalVue, mount } from '@vue/test-utils';
import Vue from 'vue';
import Vuetify from 'vuetify';

const localVue = createLocalVue();

describe('SQRFormCancelListItem', () => {
  const getWrapper = (props: any = {}) =>
    mount(CancelListItem, {
      localVue,
      vuetify: new Vuetify(vuetifyOptions),
      propsData: {
        header: 'CLICK HERE if you are unable to play or download the audio',
        label: "I'm unable to play or download the audio",
        placeholder:
          'Please describe the problem here, we will allot you new lectures shortly',
        styles: {
          backgroundColor: '#fcf8e3',
          color: '#8a6d3b',
          border: 'solid .2rem #faebcc',
          whiteSpace: 'none',
          width: '100%',
        },
        selected: false,
      },
      ...props,
    });

  const clickListItem = (wrapper: any) => {
    wrapper.find("[role='button']").trigger('click');
    return Vue.nextTick();
  };

  it('should render', () => {
    const wrapper = getWrapper();
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should emit click on list-group click', () => {
    const wrapper = getWrapper();
    clickListItem(wrapper);
    expect(wrapper.emitted().click).toBeTruthy();
  });

  it('should emit update:selected on checkbox selected', async () => {
    const wrapper = getWrapper();
    await clickListItem(wrapper);
    wrapper.find("input[type='checkbox']").setChecked();
    expect(wrapper.emitted()['update:selected']).toBeTruthy();
  });

  it('should show cancel inputs when checkbox is selected', async () => {
    const wrapper = getWrapper();
    await clickListItem(wrapper);
    expect(wrapper.find('textarea').exists()).toBe(false);
    expect(wrapper.find('button').exists()).toBe(false);
    wrapper.setProps({ selected: true });
    await Vue.nextTick();
    expect(wrapper.find('textarea').exists()).toBe(true);
    expect(wrapper.find('button').exists()).toBe(true);
  });

  it('should emit input event on textarea input', async () => {
    const wrapper = getWrapper();
    await clickListItem(wrapper);
    wrapper.setProps({ selected: true });
    await Vue.nextTick();
    wrapper.find('textarea').setValue('new text');
    // @ts-ignore
    expect(wrapper.emitted().input[0][0]).toEqual('new text');
  });
});
