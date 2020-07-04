import Home from '@/views/Home.vue';
import { shallowMount } from '@vue/test-utils';

describe('Home.vue', () => {
  it('should render', () => {
    const wrapper = shallowMount(Home);
    expect(wrapper.element).toMatchSnapshot();
  });
});
