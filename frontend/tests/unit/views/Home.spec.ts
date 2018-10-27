import { shallowMount } from "@vue/test-utils";
import Home from "@/views/Home.vue";

describe("Home.vue", () => {
  it("should render", () => {
    const wrapper = shallowMount(Home);
    expect(wrapper.element).toMatchSnapshot();
  });
});
